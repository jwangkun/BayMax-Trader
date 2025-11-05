// nof0 Interface Controller
class Nof0Interface {
    constructor() {
        console.log('Nof0Interface constructor called');
        this.configLoader = new ConfigLoader();
        window.configLoader = this.configLoader; // Make it globally available
        this.dataLoader = new DataLoader();
        this.chartManager = null;
        this.currentTab = 'positions';
        this.currentTimeRange = 'all';
        this.currentValueMode = '$';
        this.agentsData = {};
        this.selectedAgent = '';
        this.currentMarket = 'us'; // 'us' or 'cn'
        this.refreshInterval = null;
        this.isRefreshing = false;
        console.log('Calling init()...');
        this.init();
    }

    async init() {
        console.log('Nof0Interface.init() started');
    this.showLoading();

        try {
        // Load configuration first
        console.log('Loading configuration...');
        await this.configLoader.loadConfig();
        
        // Initialize data loader with current market
        this.dataLoader.setMarket(this.currentMarket);

            // Load all agents data
    console.log('Loading all agents data...');
    this.agentsData = await this.dataLoader.loadAllAgentsData();
    console.log('Agents data loaded:', Object.keys(this.agentsData));

            // Initialize components
    console.log('Setting up event listeners...');
    this.setupEventListeners();
    console.log('Populating agent selects...');
    this.populateAgentSelects();
    console.log('Updating ticker...');
    this.updateTicker();
    console.log('Updating readme stats...');
    this.updateReadmeStats();

            // Initialize chart
    console.log('Initializing chart manager...');
    this.chartManager = new Nof0ChartManager();
    console.log('Calling chartManager.init()...');
    await this.chartManager.init(this.agentsData);
    console.log('✅ Chart manager initialized successfully');

            // Load initial data
            console.log('Loading initial data...');
            this.loadPositions();
            this.loadTrades();
            this.loadAnalytics();

            // Update market display
            this.updateMarketDisplay();

            console.log('✅ Nof0Interface.init() completed successfully');

            // 启动自动刷新
            this.startAutoRefresh();

        } catch (error) {
            console.error('❌ Error initializing interface:', error);
            this.showError('Failed to load trading data');
        } finally {
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Time range controls
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.setTimeRange(range);
            });
        });

        // Value mode controls
        document.querySelectorAll('.value-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.setValueMode(mode);
            });
        });

        // Market switching buttons
        const usMarketBtn = document.getElementById('usMarketBtn');
        const cnMarketBtn = document.getElementById('cnMarketBtn');
        
        if (usMarketBtn) {
            usMarketBtn.addEventListener('click', () => {
                this.switchMarket('us');
            });
        }
        
        if (cnMarketBtn) {
            cnMarketBtn.addEventListener('click', () => {
                this.switchMarket('cn');
            });
        }

        // Agent selects
        const positionsFilter = document.getElementById('positionsAgentFilter');
        const tradesFilter = document.getElementById('tradesAgentFilter');
        
        if (positionsFilter) {
            positionsFilter.addEventListener('change', (e) => {
                this.selectedAgent = e.target.value;
                this.loadPositions();
            });
        }

        if (tradesFilter) {
            tradesFilter.addEventListener('change', (e) => {
                this.selectedAgent = e.target.value;
                this.loadTrades();
            });
        }
    }

    switchTab(tab) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update active tab content
        document.querySelectorAll('.tab-panel').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-panel`);
        });

        this.currentTab = tab;

        // Load data for the new tab
        switch (tab) {
            case 'positions':
                this.loadPositions();
                break;
            case 'trades':
                this.loadTrades();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'readme':
                // README is static, no need to load
                break;
        }
    }

    switchMarket(market) {
        if (market === this.currentMarket) return;

        console.log(`Switching market from ${this.currentMarket} to ${market}`);
        
        // Update market buttons
        document.querySelectorAll('.market-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.market === market);
        });

        // Update subtitle
        const marketConfig = this.configLoader.getMarketConfig(market);
        if (marketConfig) {
            const subtitleElement = document.getElementById('marketSubtitle');
            if (subtitleElement) {
                subtitleElement.textContent = marketConfig.subtitle;
            }
        }

        // Update data loader
        this.currentMarket = market;
        this.dataLoader.setMarket(market);
        this.selectedAgent = ''; // Reset selected agent

        // Reload all data
        this.refreshAllData();
    }

    setTimeRange(range) {
        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });

        this.currentTimeRange = range;
        if (this.chartManager) {
            this.chartManager.setTimeRange(range);
        }
    }

    setValueMode(mode) {
        // Update active button
        document.querySelectorAll('.value-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.currentValueMode = mode;
        if (this.chartManager) {
            this.chartManager.setValueMode(mode);
        }
    }

    populateAgentSelects() {
        const agentNames = Object.keys(this.agentsData);
        const selects = [
            document.getElementById('positionsAgentFilter'),
            document.getElementById('tradesAgentFilter')
        ];

        selects.forEach(select => {
            if (select) {
                // Clear existing options except the first one
                select.innerHTML = '<option value="">所有代理</option>';

                agentNames.forEach(agentName => {
                    const option = document.createElement('option');
                    option.value = agentName;
                    option.textContent = this.dataLoader.getAgentDisplayName(agentName);
                    select.appendChild(option);
                });
            }
        });
    }

    async refreshAllData() {
        console.log('Refreshing all data for market:', this.currentMarket);
        this.showLoading();

        try {
            // Clear existing data
            this.agentsData = {};
            this.dataLoader.agentData = {};

            // Load new data
            this.agentsData = await this.dataLoader.loadAllAgentsData();
            console.log('New agents data loaded:', Object.keys(this.agentsData));

            // Update chart
            if (this.chartManager) {
                await this.chartManager.reinit(this.agentsData);
            }

            // Update selects and data
            this.populateAgentSelects();
            this.loadPositions();
            this.loadTrades();
            this.loadAnalytics();
            this.updateReadmeStats();
            this.updateTicker();

        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to load trading data');
        } finally {
            this.hideLoading();
        }
    }

    loadPositions() {
        const positionsList = document.getElementById('positionsList');
        positionsList.innerHTML = '';
        const agentsToShow = this.selectedAgent ? [this.selectedAgent] : Object.keys(this.agentsData);

        agentsToShow.forEach(agentName => {
            const agentData = this.agentsData[agentName];
            const currentHoldings = this.dataLoader.getCurrentHoldings(agentName);

            if (currentHoldings) {
                Object.entries(currentHoldings).forEach(([symbol, shares]) => {
                    if (symbol !== 'CASH' && shares > 0) {
                        const positionItem = this.createPositionItem(agentName, symbol, shares);
                        positionsList.appendChild(positionItem);
                    }
                });
            }
        });

        if (positionsList.children.length === 0) {
            positionsList.innerHTML = '<div class="empty-state">暂无持仓数据</div>';
        }
    }

    createPositionItem(agentName, symbol, shares) {
        const item = document.createElement('div');
        item.className = 'position-item';

        const agentDisplayName = this.dataLoader.getAgentDisplayName(agentName);
        const iconPath = this.dataLoader.getAgentIcon(agentName);
        const brandColor = this.dataLoader.getAgentBrandColor(agentName);

        item.innerHTML = `
            <div class="position-header">
                <div class="position-symbol">
                    <div class="legend-chip-icon" style="background-color: ${brandColor}20; border: 1px solid ${brandColor}40;">
                        <img src="${iconPath}" alt="${agentDisplayName}" onerror="this.style.display='none'">
                    </div>
                    ${symbol}
                </div>
                <div class="position-shares">${shares} shares</div>
            </div>
            <div class="position-footer">
                <div class="position-agent">${agentDisplayName}</div>
                <div class="position-value">$${(shares * 100).toFixed(2)}</div>
            </div>
        `;

        return item;
    }

    async loadTrades() {
        const tradesList = document.getElementById('tradesList');
        tradesList.innerHTML = '';

        // Check if required dependencies are available
        if (!this.dataLoader || !window.configLoader) {
            console.warn('Required dependencies not available for loading trades');
            tradesList.innerHTML = '<div class="empty-state">系统初始化中，请稍候...</div>';
            return;
        }

        // Initialize transaction loader if not already done
        if (!window.transactionLoader) {
            window.transactionLoader = new TransactionLoader();
        }

        // Ensure dataLoader is available globally for transaction loader
        if (!window.dataLoader) {
            window.dataLoader = this.dataLoader;
        }

        try {
            // Load all transactions
            await window.transactionLoader.loadAllTransactions();
            
            // Get recent transactions
            const allTransactions = window.transactionLoader.getMostRecentTransactions(50);
            
            // Filter by selected agent if any
            const filteredTransactions = this.selectedAgent 
                ? allTransactions.filter(t => t.agentFolder === this.selectedAgent)
                : allTransactions;

            // Create transaction items (async)
            for (let i = 0; i < Math.min(20, filteredTransactions.length); i++) {
                const transaction = filteredTransactions[i];
                const tradeItem = await this.createTransactionItem(transaction);
                tradesList.appendChild(tradeItem);
            }

            if (tradesList.children.length === 0) {
                tradesList.innerHTML = '<div class="empty-state">暂无交易记录</div>';
            }

            // Set up load more functionality
            this.setupLoadMoreTransactions(tradesList, filteredTransactions);

        } catch (error) {
            console.error('Error loading trades:', error);
            tradesList.innerHTML = '<div class="empty-state">加载交易记录失败</div>';
        }
    }

    async createTransactionItem(transaction) {
        const item = document.createElement('div');
        item.className = 'trade-item action-card';

        // Safely get agent information with fallbacks
        const agentDisplayName = this.dataLoader ? 
            this.dataLoader.getAgentDisplayName(transaction.agentFolder) : 
            transaction.agentFolder;
        
        const iconPath = this.dataLoader ? 
            this.dataLoader.getAgentIcon(transaction.agentFolder) : 
            'figs/stock.svg'; // fallback icon
        
        const brandColor = this.dataLoader ? 
            this.dataLoader.getAgentBrandColor(transaction.agentFolder) : 
            '#666666'; // fallback color
        
        const actionIcon = transaction.action === 'buy' ? '↑' : '↓';
        const actionClass = transaction.action === 'buy' ? 'positive' : 'negative';

        // Safely format date
        const formattedDate = window.transactionLoader ? 
            window.transactionLoader.formatDateTime(transaction.date) : 
            transaction.date;

        // Load agent's thinking
        let thinking = null;
        if (window.transactionLoader && this.dataLoader) {
            try {
                thinking = await window.transactionLoader.loadAgentThinking(
                    transaction.agentFolder, 
                    transaction.date, 
                    this.dataLoader.getMarket()
                );
            } catch (error) {
                console.warn(`Failed to load thinking for ${transaction.agentFolder}:`, error);
            }
        }

        // Build card HTML - similar to docs implementation
        let cardHTML = `
            <div class="action-header">
                <div class="action-agent-icon">
                    <img src="${iconPath}" alt="${agentDisplayName}" onerror="this.style.display='none'">
                </div>
                <div class="action-meta">
                    <div class="action-agent-name">${agentDisplayName}</div>
                    <div class="action-details">
                        <span class="action-type ${actionClass}">${transaction.action}</span>
                        <span class="action-symbol">${transaction.symbol}</span>
                        <span class="action-amount">×${transaction.amount}</span>
                        <span class="action-timestamp">${formattedDate}</span>
                    </div>
                </div>
            </div>
        `;

        // Only add reasoning section if thinking is available
        if (thinking !== null) {
            cardHTML += `
            <div class="action-body">
                <div class="action-thinking-label">
                    <span class="thinking-icon">🧠</span>
                    Agent Reasoning
                </div>
                <div class="action-thinking">${this.formatThinking(thinking)}</div>
            </div>
            `;
        }

        item.innerHTML = cardHTML;
        return item;
    }

    // Format thinking text into paragraphs
    formatThinking(text) {
        if (!text) return '';
        
        // Split by double newlines or numbered lists
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

        if (paragraphs.length === 0) {
            return `<p>${text}</p>`;
        }

        return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    }

    // Set up load more transactions functionality
    setupLoadMoreTransactions(container, allTransactions) {
        // State for pagination
        this.transactionState = {
            allTransactions: allTransactions,
            loadedCount: Math.min(20, allTransactions.length),
            pageSize: 20,
            maxTransactions: 100,
            isLoading: false,
            container: container
        };

        // Add load more button if there are more transactions
        if (allTransactions.length > 20) {
            this.addLoadMoreButton();
        }
    }

    // Add load more button
    addLoadMoreButton() {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = '加载更多交易记录';
        loadMoreBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-top: 16px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreTransactions();
        });

        this.transactionState.container.appendChild(loadMoreBtn);
        this.transactionState.loadMoreBtn = loadMoreBtn;
    }

    // Load more transactions
    async loadMoreTransactions() {
        if (!this.transactionState || this.transactionState.isLoading) return;
        if (this.transactionState.loadedCount >= this.transactionState.allTransactions.length) return;
        if (this.transactionState.loadedCount >= this.transactionState.maxTransactions) return;

        this.transactionState.isLoading = true;

        // Update button text
        if (this.transactionState.loadMoreBtn) {
            this.transactionState.loadMoreBtn.textContent = '正在加载...';
            this.transactionState.loadMoreBtn.disabled = true;
        }

        // Calculate how many to load
        const startIndex = this.transactionState.loadedCount;
        const endIndex = Math.min(
            startIndex + this.transactionState.pageSize,
            this.transactionState.allTransactions.length,
            this.transactionState.maxTransactions
        );

        // Load this batch (async)
        for (let i = startIndex; i < endIndex; i++) {
            const transaction = this.transactionState.allTransactions[i];
            const transactionItem = await this.createTransactionItem(transaction);
            
            // Insert before the load more button
            if (this.transactionState.loadMoreBtn) {
                this.transactionState.container.insertBefore(transactionItem, this.transactionState.loadMoreBtn);
            } else {
                this.transactionState.container.appendChild(transactionItem);
            }
        }

        this.transactionState.loadedCount = endIndex;
        this.transactionState.isLoading = false;

        // Update or remove load more button
        if (this.transactionState.loadMoreBtn) {
            if (this.transactionState.loadedCount >= this.transactionState.allTransactions.length ||
                this.transactionState.loadedCount >= this.transactionState.maxTransactions) {
                // Remove button if no more to load
                this.transactionState.loadMoreBtn.remove();
                this.transactionState.loadMoreBtn = null;
            } else {
                // Reset button
                this.transactionState.loadMoreBtn.textContent = '加载更多交易记录';
                this.transactionState.loadMoreBtn.disabled = false;
            }
        }
    }

    loadAnalytics() {
        const analyticsContent = document.getElementById('analyticsContent');
        analyticsContent.innerHTML = '';

        const agentNames = Object.keys(this.agentsData);

        if (agentNames.length === 0) {
            analyticsContent.innerHTML = '<div class="empty-state">暂无分析数据</div>';
            return;
        }

        // Calculate analytics metrics
        const metrics = this.calculateAnalytics();

        Object.entries(metrics).forEach(([label, value]) => {
            const metricDiv = document.createElement('div');
            metricDiv.className = 'analytics-metric';
            metricDiv.innerHTML = `
                <div class="analytics-metric-label">${label}</div>
                <div class="analytics-metric-value">${value}</div>
            `;
            analyticsContent.appendChild(metricDiv);
        });
    }

    calculateAnalytics() {
        const agentNames = Object.keys(this.agentsData);

        if (agentNames.length === 0) {
            return {};
        }

        // Best performer
        let bestAgent = null;
        let bestReturn = -Infinity;
        let worstReturn = Infinity;
        let totalReturn = 0;

        agentNames.forEach(agentName => {
            const returnValue = this.agentsData[agentName].return;
            totalReturn += returnValue;

            if (returnValue > bestReturn) {
                bestReturn = returnValue;
                bestAgent = agentName;
            }

            if (returnValue < worstReturn) {
                worstReturn = returnValue;
            }
        });

        const avgReturn = totalReturn / agentNames.length;

        return {
            '最佳表现': bestAgent ? `${this.dataLoader.getAgentDisplayName(bestAgent)} (+${bestReturn.toFixed(2)}%)` : 'N/A',
            '平均收益': `${avgReturn.toFixed(2)}%`,
            '最差收益': `${worstReturn.toFixed(2)}%`,
            '代理总数': agentNames.length,
            '活跃持仓': this.getTotalPositions(),
            '交易总数': this.getTotalTrades()
        };
    }

    getTotalPositions() {
        let total = 0;
        Object.keys(this.agentsData).forEach(agentName => {
            const holdings = this.dataLoader.getCurrentHoldings(agentName);
            if (holdings) {
                total += Object.keys(holdings).filter(s => s !== 'CASH' && holdings[s] > 0).length;
            }
        });
        return total;
    }

    getTotalTrades() {
        let total = 0;
        Object.keys(this.agentsData).forEach(agentName => {
            const trades = this.dataLoader.getTradeHistory(agentName);
            total += trades.length;
        });
        return total;
    }

    updateTicker() {
        // Get all unique symbols from all agents' holdings
        const allSymbols = this.getAllHoldingSymbols();
        
        // Generate ticker data for held symbols
        const tickerData = allSymbols.map(symbol => {
            // Generate realistic price and change data
            const basePrice = this.getSymbolBasePrice(symbol);
            const change = (Math.random() - 0.5) * 10; // Random change between -5% and +5%
            const price = basePrice * (1 + change / 100);
            
            return {
                symbol,
                price: price,
                change: change
            };
        });

        // Update ticker content
        const tickerContent = this.safeGetElement('tickerContent');
        if (tickerContent) {
            tickerContent.innerHTML = '';

            // Duplicate the data to create seamless scrolling
            [...tickerData, ...tickerData].forEach(item => {
                const tickerItem = document.createElement('div');
                tickerItem.className = 'ticker-item';

                const changeClass = item.change >= 0 ? 'positive' : 'negative';
                const changeSign = item.change >= 0 ? '+' : '';

                tickerItem.innerHTML = `
                    <span class="ticker-symbol">${item.symbol}</span>
                    <span class="ticker-price">$${item.price.toFixed(2)}</span>
                    <span class="ticker-change ${changeClass}">${changeSign}${item.change.toFixed(2)}%</span>
                `;

                tickerContent.appendChild(tickerItem);
            });
        }
    }

    // Get all unique symbols from all agents' holdings
    getAllHoldingSymbols() {
        const symbolsSet = new Set();
        
        Object.keys(this.agentsData).forEach(agentName => {
            const holdings = this.dataLoader.getCurrentHoldings(agentName);
            if (holdings) {
                Object.keys(holdings).forEach(symbol => {
                    if (symbol !== 'CASH' && holdings[symbol] > 0) {
                        symbolsSet.add(symbol);
                    }
                });
            }
        });
        
        return Array.from(symbolsSet).sort();
    }

    // Get base price for a symbol (for realistic price generation)
    getSymbolBasePrice(symbol) {
        const basePrices = {
            'NVDA': 142.35,
            'MSFT': 415.50,
            'AAPL': 225.75,
            'GOOGL': 175.20,
            'GOOG': 175.20,
            'AMZN': 185.90,
            'META': 520.30,
            'AMD': 155.80,
            'MU': 95.40,
            'PEP': 165.25,
            'AMGN': 285.60,
            'CMCSA': 42.15,
            'AVGO': 1650.75,
            'ASML': 720.40,
            'AMAT': 195.30,
            'CRWD': 285.90,
            'MRVL': 75.20,
            'PLTR': 45.80,
            'CSCO': 55.30,
            'ARM': 145.60,
            'INTC': 23.45,
            'TSLA': 267.89,
            'BTC': 97432.21,
            'ETH': 3245.67,
            'SOL': 245.32
        };
        
        return basePrices[symbol] || 100.00; // Default price if symbol not found
    }

    updateReadmeStats() {
        const agentNames = Object.keys(this.agentsData);

        const readmeAgentCount = this.safeGetElement('readmeAgentCount');
        if (readmeAgentCount) {
            readmeAgentCount.textContent = agentNames.length;
        }

        // Calculate date range
        let minDate = null;
        let maxDate = null;

        agentNames.forEach(name => {
            const history = this.agentsData[name].assetHistory;
            if (history.length > 0) {
                const firstDate = history[0].date;
                const lastDate = history[history.length - 1].date;

                if (!minDate || firstDate < minDate) minDate = firstDate;
                if (!maxDate || lastDate > maxDate) maxDate = lastDate;
            }
        });

        // Remove test period update since it's not in the current HTML structure
    }

    updateMarketDisplay() {
        // Update market buttons
        document.querySelectorAll('.market-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.market === this.currentMarket);
        });

        // Update subtitle
        const marketConfig = this.configLoader.getMarketConfig(this.currentMarket);
        if (marketConfig) {
            const subtitleElement = this.safeGetElement('marketSubtitle');
            if (subtitleElement) {
                subtitleElement.textContent = marketConfig.subtitle;
            }
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showRefreshStatus() {
        // 在页面右上角显示刷新状态
        let refreshIndicator = document.getElementById('refreshIndicator');
        if (!refreshIndicator) {
            refreshIndicator = document.createElement('div');
            refreshIndicator.id = 'refreshIndicator';
            refreshIndicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(refreshIndicator);
        }
        
        refreshIndicator.innerHTML = `
            <div style="width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            正在刷新数据...
        `;
        
        // 添加旋转动画
        if (!document.getElementById('refreshSpinStyle')) {
            const style = document.createElement('style');
            style.id = 'refreshSpinStyle';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        refreshIndicator.style.display = 'flex';
    }

    hideRefreshStatus() {
        const refreshIndicator = document.getElementById('refreshIndicator');
        if (refreshIndicator) {
            refreshIndicator.style.display = 'none';
        }
    }

    showError(message) {
        alert(message);
    }

    // 启动自动刷新
    startAutoRefresh() {
        console.log('Starting auto refresh every 30 seconds...');
        
        // 清除现有的定时器
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // 设置30秒刷新一次
        this.refreshInterval = setInterval(async () => {
            if (!this.isRefreshing) {
                await this.refreshData();
            }
        }, 30000); // 30秒 = 30000毫秒
    }

    // 停止自动刷新
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto refresh stopped');
        }
    }

    // 刷新数据
    async refreshData() {
        if (this.isRefreshing) {
            console.log('Already refreshing, skipping...');
            return;
        }

        this.isRefreshing = true;
        console.log('Refreshing data...');
        
        // 显示刷新状态
        this.showRefreshStatus();

        try {
            // 清除数据加载器的缓存
            this.dataLoader.priceCache = {};
            this.dataLoader.agentData = {};

            // 重新加载所有代理数据
            const newAgentsData = await this.dataLoader.loadAllAgentsData();
            // 检查数据是否有变化
            const hasChanges = this.hasDataChanged(this.agentsData, newAgentsData);
            
            if (hasChanges) {
                console.log('Data has changed, updating interface...');
                this.agentsData = newAgentsData;

                // 更新图表
                if (this.chartManager) {
                    await this.chartManager.reinit(this.agentsData);
                }

                // 更新当前显示的内容
                this.refreshCurrentView();
                
                // 更新统计信息
                this.updateReadmeStats();
                
                console.log('✅ Data refresh completed');
            } else {
                console.log('No data changes detected');
            }

        } catch (error) {
            console.error('❌ Error refreshing data:', error);
        } finally {
            this.isRefreshing = false;
            this.hideRefreshStatus();
        }
    }

    // 检查数据是否有变化
    hasDataChanged(oldData, newData) {
        // 简单的变化检测：比较代理数量和最后更新时间
        const oldAgents = Object.keys(oldData);
        const newAgents = Object.keys(newData);
        
        if (oldAgents.length !== newAgents.length) {
            return true;
        }
        
        // 检查每个代理的最新资产历史记录
        for (const agentName of newAgents) {
            const oldAgent = oldData[agentName];
            const newAgent = newData[agentName];
            
            if (!oldAgent || !newAgent) {
                return true;
            }
            
            const oldHistory = oldAgent.assetHistory || [];
            const newHistory = newAgent.assetHistory || [];
            
            if (oldHistory.length !== newHistory.length) {
                return true;
            }
            
            // 检查最后一条记录是否有变化
            if (oldHistory.length > 0 && newHistory.length > 0) {
                const oldLast = oldHistory[oldHistory.length - 1];
                const newLast = newHistory[newHistory.length - 1];
                
                if (oldLast.date !== newLast.date || 
                    Math.abs(oldLast.value - newLast.value) > 0.01) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // 刷新当前视图
    refreshCurrentView() {
        switch (this.currentTab) {
            case 'positions':
                this.loadPositions();
                break;
            case 'trades':
                this.loadTrades();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
        
        // 更新ticker
        this.updateTicker();
    }

    // 页面卸载时清理定时器
    destroy() {
        this.stopAutoRefresh();
        if (this.chartManager) {
            this.chartManager.destroy();
        }
    }

    // 安全地获取DOM元素
    safeGetElement(id) {
        try {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with id '${id}' not found`);
            }
            return element;
        } catch (error) {
            console.error(`Error getting element '${id}':`, error);
            return null;
        }
    }
}

// Initialize interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - Initializing Nof0Interface...');
    try {
        // 确保DOM完全加载后再初始化
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            window.nof0Interface = new Nof0Interface();
            console.log('✅ Nof0Interface initialized successfully');
        } else {
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'complete') {
                    window.nof0Interface = new Nof0Interface();
                    console.log('✅ Nof0Interface initialized successfully');
                }
            });
        }
    } catch (error) {
        console.error('❌ Failed to initialize Nof0Interface:', error);
    }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.nof0Interface) {
        window.nof0Interface.destroy();
    }
});

// 页面隐藏时停止刷新，显示时恢复刷新
document.addEventListener('visibilitychange', () => {
    if (window.nof0Interface) {
        if (document.hidden) {
            console.log('Page hidden, stopping auto refresh');
            window.nof0Interface.stopAutoRefresh();
        } else {
            console.log('Page visible, starting auto refresh');
            window.nof0Interface.startAutoRefresh();
        }
    }
});