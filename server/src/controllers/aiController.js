const { db } = require('../models/db');

const MAX_DETAIL_ROWS = 5;
const AZURE_OPENAI_ENDPOINT = String(process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'smartstock-ai-mini';
const AZURE_OPENAI_ENABLED = process.env.AZURE_OPENAI_ENABLED === 'true';
const AZURE_TIMEOUT_MS = Math.max(1000, Number(process.env.AZURE_OPENAI_TIMEOUT_MS) || 12000);
let tokenCache = null;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getManagedIdentityToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresOn > now + 300) return tokenCache.value;

  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;
  if (!identityEndpoint || !identityHeader) {
    throw new Error('Azure managed identity is not available');
  }

  const tokenUrl = new URL(identityEndpoint);
  tokenUrl.searchParams.set('resource', 'https://cognitiveservices.azure.com');
  tokenUrl.searchParams.set('api-version', '2019-08-01');
  const response = await fetchWithTimeout(tokenUrl, {
    headers: { 'X-IDENTITY-HEADER': identityHeader }
  });
  if (!response.ok) throw new Error(`Managed identity token request failed (${response.status})`);

  const payload = await response.json();
  if (!payload.access_token) throw new Error('Managed identity did not return an access token');
  tokenCache = {
    value: payload.access_token,
    expiresOn: Number(payload.expires_on || now + 600)
  };
  return tokenCache.value;
}

function parseAzureBriefing(content) {
  const normalized = String(content || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const parsed = JSON.parse(normalized);
  const allowedTones = new Set(['warning', 'success', 'info', 'neutral']);
  if (!parsed || typeof parsed.summary !== 'string' || !Array.isArray(parsed.insights)) {
    throw new Error('Azure AI returned an invalid briefing');
  }

  const insights = parsed.insights.slice(0, 4).map((insight) => ({
    tone: allowedTones.has(insight?.tone) ? insight.tone : 'neutral',
    title: String(insight?.title || '').slice(0, 100),
    detail: String(insight?.detail || '').slice(0, 320)
  })).filter((insight) => insight.title && insight.detail);
  if (!insights.length) throw new Error('Azure AI returned no usable insights');

  return { summary: parsed.summary.slice(0, 500), insights };
}

async function createAzureBriefing(data, language) {
  if (!AZURE_OPENAI_ENABLED || !AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure AI is not enabled');
  }

  const accessToken = await getManagedIdentityToken();
  const response = await fetchWithTimeout(`${AZURE_OPENAI_ENDPOINT}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: AZURE_OPENAI_DEPLOYMENT,
      temperature: 0.2,
      max_completion_tokens: 450,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You create concise read-only inventory operations briefings.',
            'Use only the supplied aggregate data. Never invent values or suggest that you changed data.',
            `Write in ${language === 'zh' ? 'Simplified Chinese' : 'English'}.`,
            'Return JSON only: {"summary":"...","insights":[{"tone":"warning|success|info|neutral","title":"...","detail":"..."}]}.',
            'Return exactly four practical insights. Do not include markdown.'
          ].join(' ')
        },
        { role: 'user', content: JSON.stringify(data) }
      ]
    })
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(`Azure AI request failed (${response.status}${problem?.error?.code ? ` ${problem.error.code}` : ''})`);
  }

  const payload = await response.json();
  return parseAzureBriefing(payload.choices?.[0]?.message?.content);
}

function money(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function collectBriefingData() {
  const inventory = db.prepare(`
    SELECT
      COUNT(*) AS total_products,
      COALESCE(SUM(quantity), 0) AS total_units,
      COALESCE(SUM(quantity * cost), 0) AS inventory_cost,
      COALESCE(SUM(quantity * price), 0) AS retail_value,
      SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count
    FROM products
  `).get();
  const lowStock = db.prepare(`
    SELECT sku, name, quantity, low_stock_threshold
    FROM products
    WHERE quantity <= low_stock_threshold
    ORDER BY quantity ASC, name ASC
    LIMIT ?
  `).all(MAX_DETAIL_ROWS);
  const openOrders = db.prepare(`
    SELECT product_name, quantity, status, destination_region, order_type
    FROM orders
    WHERE status NOT IN ('Delivered', 'Cancelled')
    ORDER BY created_at ASC, id ASC
    LIMIT ?
  `).all(MAX_DETAIL_ROWS);
  const orderCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE status NOT IN ('Delivered', 'Cancelled')
  `).get();
  const recentSales = db.prepare(`
    SELECT
      COALESCE(SUM(quantity_sold), 0) AS units,
      COALESCE(SUM(total_price), 0) AS revenue,
      COUNT(*) AS transactions
    FROM sales
    WHERE sale_date >= datetime('now', '-30 days')
  `).get();
  const recentBestSeller = db.prepare(`
    SELECT products.name, SUM(sales.quantity_sold) AS units
    FROM sales
    JOIN products ON products.id = sales.product_id
    WHERE sales.sale_date >= datetime('now', '-30 days')
    GROUP BY products.id
    ORDER BY units DESC, products.name ASC
    LIMIT 1
  `).get();
  const settings = db.prepare('SELECT currency FROM settings WHERE id = 1').get() || { currency: 'USD' };

  return {
    inventory: {
      total_products: Number(inventory.total_products || 0),
      total_units: Number(inventory.total_units || 0),
      inventory_cost: Number(inventory.inventory_cost || 0),
      retail_value: Number(inventory.retail_value || 0),
      low_stock_count: Number(inventory.low_stock_count || 0)
    },
    low_stock: lowStock,
    open_orders: openOrders,
    open_order_count: Number(orderCount.count || 0),
    recent_sales: {
      units: Number(recentSales.units || 0),
      revenue: Number(recentSales.revenue || 0),
      transactions: Number(recentSales.transactions || 0),
      best_seller: recentBestSeller || null
    },
    currency: settings.currency || 'USD'
  };
}

function createEnglishBriefing(data) {
  const lowStockNames = data.low_stock.map((item) => item.name).join(', ');
  const firstOrder = data.open_orders[0];
  const sales = data.recent_sales;

  return {
    summary: data.inventory.low_stock_count
      ? `${data.inventory.low_stock_count} product${data.inventory.low_stock_count === 1 ? '' : 's'} need inventory attention. ${data.open_order_count} open order${data.open_order_count === 1 ? '' : 's'} remain in the operations queue.`
      : `Inventory is healthy across ${data.inventory.total_products} products. ${data.open_order_count} open order${data.open_order_count === 1 ? '' : 's'} remain in the operations queue.`,
    insights: [
      {
        tone: data.inventory.low_stock_count ? 'warning' : 'success',
        title: data.inventory.low_stock_count ? 'Prioritize low-stock items' : 'Inventory is healthy',
        detail: data.inventory.low_stock_count
          ? `${lowStockNames || 'Low-stock products'} should be reviewed before the next sales cycle.`
          : `No products are currently at or below their low-stock threshold.`
      },
      {
        tone: data.open_order_count ? 'info' : 'success',
        title: data.open_order_count ? 'Review the open order queue' : 'No open orders',
        detail: firstOrder
          ? `${firstOrder.product_name} is ${firstOrder.status.toLowerCase()} for ${firstOrder.destination_region}; ${data.open_order_count} open order${data.open_order_count === 1 ? '' : 's'} in total.`
          : 'All purchase and international orders are completed or cancelled.'
      },
      {
        tone: sales.transactions ? 'success' : 'neutral',
        title: 'Last 30 days of sales',
        detail: sales.transactions
          ? `${sales.units} units generated ${money(sales.revenue, data.currency)} across ${sales.transactions} transaction${sales.transactions === 1 ? '' : 's'}${sales.best_seller ? `; ${sales.best_seller.name} was the top seller` : ''}.`
          : 'No sales were recorded in the last 30 days.'
      },
      {
        tone: 'neutral',
        title: 'Inventory position',
        detail: `${data.inventory.total_units} units are on hand with ${money(data.inventory.retail_value, data.currency)} in potential retail value.`
      }
    ]
  };
}

function createChineseBriefing(data) {
  const lowStockNames = data.low_stock.map((item) => item.name).join('、');
  const firstOrder = data.open_orders[0];
  const sales = data.recent_sales;

  return {
    summary: data.inventory.low_stock_count
      ? `${data.inventory.low_stock_count} 个商品需要关注库存，当前还有 ${data.open_order_count} 个未完成订单。`
      : `${data.inventory.total_products} 个商品的库存状态正常，当前还有 ${data.open_order_count} 个未完成订单。`,
    insights: [
      {
        tone: data.inventory.low_stock_count ? 'warning' : 'success',
        title: data.inventory.low_stock_count ? '优先处理低库存商品' : '库存状态良好',
        detail: data.inventory.low_stock_count
          ? `${lowStockNames || '低库存商品'}需要在下一轮销售前检查并安排补货。`
          : '目前没有商品达到或低于低库存阈值。'
      },
      {
        tone: data.open_order_count ? 'info' : 'success',
        title: data.open_order_count ? '检查未完成订单' : '没有未完成订单',
        detail: firstOrder
          ? `${firstOrder.product_name} 当前状态为 ${firstOrder.status}，目的地为 ${firstOrder.destination_region}；共有 ${data.open_order_count} 个未完成订单。`
          : '全部采购和跨境订单均已完成或取消。'
      },
      {
        tone: sales.transactions ? 'success' : 'neutral',
        title: '最近 30 天销售情况',
        detail: sales.transactions
          ? `${sales.transactions} 笔交易共售出 ${sales.units} 件，收入 ${money(sales.revenue, data.currency)}${sales.best_seller ? `；畅销商品为 ${sales.best_seller.name}` : ''}。`
          : '最近 30 天没有销售记录。'
      },
      {
        tone: 'neutral',
        title: '库存概况',
        detail: `当前共有 ${data.inventory.total_units} 件库存，潜在零售价值为 ${money(data.inventory.retail_value, data.currency)}。`
      }
    ]
  };
}

exports.generateBriefing = async (req, res) => {
  const started = Date.now();
  const language = req.body?.language === 'zh' ? 'zh' : 'en';

  try {
    const data = collectBriefingData();
    let mode = 'local-preview';
    let provider = 'local-preview';
    let content;

    if (AZURE_OPENAI_ENABLED) {
      try {
        content = await createAzureBriefing(data, language);
        mode = 'azure-ai';
        provider = 'azure-openai';
      } catch (azureError) {
        console.warn(`Azure AI briefing fallback: ${azureError.message}`);
        content = language === 'zh' ? createChineseBriefing(data) : createEnglishBriefing(data);
        mode = 'local-fallback';
        provider = 'local-fallback';
      }
    } else {
      content = language === 'zh' ? createChineseBriefing(data) : createEnglishBriefing(data);
    }

    const duration = Date.now() - started;
    const info = db.prepare(`
      INSERT INTO ai_activity_logs
        (user_id, user_name, language, provider, status, records_read, duration_ms)
      VALUES (?, ?, ?, ?, 'success', ?, ?)
    `).run(
      req.user.id,
      req.user.name,
      language,
      provider,
      data.low_stock.length + data.open_orders.length + 3,
      duration
    );

    res.json({
      success: true,
      data: {
        mode,
        read_only: true,
        generated_at: new Date().toISOString(),
        activity_id: Number(info.lastInsertRowid),
        ...content,
        scope: {
          products: data.inventory.total_products,
          low_stock_items: data.inventory.low_stock_count,
          open_orders: data.open_order_count,
          recent_sales_days: 30,
          detail_limit: MAX_DETAIL_ROWS
        }
      }
    });
  } catch (error) {
    try {
      const errorProvider = AZURE_OPENAI_ENABLED ? 'azure-openai' : 'local-preview';
      db.prepare(`
        INSERT INTO ai_activity_logs
          (user_id, user_name, language, provider, status, records_read, duration_ms)
        VALUES (?, ?, ?, ?, 'error', 0, ?)
      `).run(req.user.id, req.user.name, language, errorProvider, Date.now() - started);
    } catch { /* avoid masking the original error */ }
    throw error;
  }
};
