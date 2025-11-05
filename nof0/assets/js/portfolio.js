// BayMax Trade Agent - 投资组合分析页面
// Detailed view of individual agent portfolios

let configLoader = null;
let dataLoader = null;
let allAgentsData = {};
let currentAgent = null;
let allocationChart = null;
let currentMarket = 'us'; // 'us' or 'cn'

// Initialize the page
async function init() {
    showLoading();

    try {
        // Initialize configuration loader
        configLoader = new ConfigLoader();
        window.configLoader = configLoader; // Make it globally available
        
        // Load configuration first
        console.log('Loading configuration...');
        await configLoader.loadConfig();
        
        // Initialize data loader
        dataLoader = new DataLoader();
        dataLoader.setMarket(currentMarket);

        // Load all agents data
        console.log('正在加载所有智能体数据...');
        allAgentsData = await dataLoader.loadAllAgentsData();
        console.log('数据已加载:', allAgentsData);

        // Populate agent selector
        populateAgentSelector();

        // Load first agent by default
        const firstAgent = Object.keys(allAgentsData)[0];
        if (firstAgent) {
            currentAgent = firstAgent;
            await loadAgentPortfolio(firstAgent);
        }

        // Set up event listeners
        setupEventListeners();

        // Update market display
        updateMarketDisplay();

    } catch (error) {
        console.error('初始化页面时出错:', error);
        console.error('Error details:', error.stack);
        showError('加载投资组合数据失败。请查看控制台了解详情。');
    } finally {
        hideLoading();
    }
}

// Populate agent selector dropdown
function populateAgentSelector() {
    const select = document.getElementById('agentSelect');
    select.innerHTML = '';

    Object.keys(allAgentsData).forEach(agentName => {
        const option = document.createElement('option');
        option.value = agentName;
        // Use text only for dropdown options (HTML select doesn't support images well)
        option.textContent = dataLoader.getAgentDisplayName(agentName);
        select.appendChild(option);
    });
}

// Load and display portfolio for selected agent
async function loadAgentPortfolio(agentName) {
    showLoading();

    try {
        currentAgent = agentName;
        const data = allAgentsData[agentName];

        // Update performance metrics
        updateMetrics(data);

        // Update holdings table
        await updateHoldingsTable(agentName);

        // Update allocation chart
        await updateAllocationChart(agentName);

        // Update trade history
        updateTradeHistory(agentName);

        // Update leaderboard
        updateLeaderboard();

    } catch (error) {
        console.error('加载投资组合时出错:', error);
    } finally {
        hideLoading();
    }
}

// Update performance metrics
function updateMetrics(data) {
    const totalAsset = data.currentValue;
    const totalReturn = data.return;
    const latestPosition = data.positions && data.positions.length > 0 ? data.positions[data.positions.length - 1] : null;
    const cashPosition = latestPosition && latestPosition.positions ? latestPosition.positions.CASH || 0 : 0;
    const totalTrades = data.positions ? data.positions.filter(p => p.this_action).length : 0;

    document.getElementById('totalAsset').textContent = dataLoader.formatCurrency(totalAsset);
    document.getElementById('totalReturn').textContent = dataLoader.formatPercent(totalReturn);
    document.getElementById('totalReturn').className = `metric-value ${totalReturn >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('cashPosition').textContent = dataLoader.formatCurrency(cashPosition);
    document.getElementById('totalTrades').textContent = totalTrades;
}

// Update holdings table
async function updateHoldingsTable(agentName) {
    const holdings = dataLoader.getCurrentHoldings(agentName);
    const tableBody = document.getElementById('holdingsTableBody');
    tableBody.innerHTML = '';

    if (!holdings) {
        return;
    }

    const data = allAgentsData[agentName];
    if (!data || !data.assetHistory || data.assetHistory.length === 0) {
        return;
    }

    const latestDate = data.assetHistory[data.assetHistory.length - 1].date;
    const totalValue = data.currentValue;

    // Get all stocks with non-zero holdings
    const stocks = Object.entries(holdings)
        .filter(([symbol, shares]) => symbol !== 'CASH' && shares > 0);
    // Sort by market value (descending)
    const holdingsData = await Promise.all(
        stocks.map(async ([symbol, shares]) => {
            const price = await dataLoader.getClosingPrice(symbol, latestDate);
            const marketValue = price ? shares * price : 0;
            return { symbol, shares, price, marketValue };
        })
    );

    holdingsData.sort((a, b) => b.marketValue - a.marketValue);

    // Create table rows
    holdingsData.forEach(holding => {
        const weight = (holding.marketValue / totalValue * 100).toFixed(2);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="symbol">${holding.symbol}</td>
            <td>${holding.shares}</td>
            <td>${dataLoader.formatCurrency(holding.price || 0)}</td>
            <td>${dataLoader.formatCurrency(holding.marketValue)}</td>
            <td>${weight}%</td>
        `;
        tableBody.appendChild(row);
    });

    // Add cash row
    if (holdings.CASH > 0) {
        const cashWeight = (holdings.CASH / totalValue * 100).toFixed(2);
        const cashRow = document.createElement('tr');
        cashRow.innerHTML = `
            <td class="symbol">CASH</td>
            <td>-</td>
            <td>-</td>
            <td>${dataLoader.formatCurrency(holdings.CASH)}</td>
            <td>${cashWeight}%</td>
        `;
        tableBody.appendChild(cashRow);
    }

    // If no holdings data, show a message
    if (holdingsData.length === 0 && (!holdings.CASH || holdings.CASH === 0)) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                无可用持仓数据
            </td>
        `;
        tableBody.appendChild(noDataRow);
    }
}

// Update allocation chart (pie chart) with enhanced design
async function updateAllocationChart(agentName) {
    const holdings = dataLoader.getCurrentHoldings(agentName);
    const legendContainer = document.getElementById('allocationLegend');
    
    if (!holdings) {
        if (legendContainer) {
            legendContainer.innerHTML = '<p style="color: var(--gray-400); text-align: center;">暂无持仓数据</p>';
        }
        return;
    }

    const data = allAgentsData[agentName];
    const latestDate = data.assetHistory[data.assetHistory.length - 1].date;

    // Calculate market values
    const allocations = [];

    for (const [symbol, shares] of Object.entries(holdings)) {
        if (symbol === 'CASH') {
            if (shares > 0) {
                allocations.push({ label: 'CASH', value: shares });
            }
        } else if (shares > 0) {
            const price = await dataLoader.getClosingPrice(symbol, latestDate);
            if (price) {
                allocations.push({ label: symbol, value: shares * price });
            }
        }
    }

    // Sort by value and take top 10, combine rest as "Others"
    allocations.sort((a, b) => b.value - a.value);
    const topAllocations = allocations.slice(0, 10);
    const othersValue = allocations.slice(10).reduce((sum, a) => sum + a.value, 0);

    if (othersValue > 0) {
        topAllocations.push({ label: '其他', value: othersValue });
    }

    // Destroy existing chart
    if (allocationChart) {
        allocationChart.destroy();
    }

    // Enhanced color palette that matches the design system
    const colors = [
        '#3b82f6', // Blue
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#8b5cf6', // Violet
        '#06b6d4', // Cyan
        '#84cc16', // Lime
        '#f97316', // Orange
        '#ec4899', // Pink
        '#6366f1', // Indigo
        '#64748b'  // Slate for others
    ];

    // Create new chart
    const ctx = document.getElementById('allocationChart').getContext('2d');

    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: topAllocations.map(a => a.label),
            datasets: [{
                data: topAllocations.map(a => a.value),
                backgroundColor: colors.slice(0, topAllocations.length),
                borderWidth: 2,
                borderColor: 'var(--background)',
                hoverBorderWidth: 3,
                hoverBorderColor: 'var(--foreground)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We'll use custom legend
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = dataLoader.formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateRotate: true,
                duration: 1000
            },
            interaction: {
                intersect: false
            }
        }
    });

    // Update custom legend
    if (legendContainer) {
        const totalValue = topAllocations.reduce((sum, item) => sum + item.value, 0);
        legendContainer.innerHTML = topAllocations.map((item, index) => {
            const percentage = ((item.value / totalValue) * 100).toFixed(1);
            return `
                <div class="allocation-legend-item">
                    <div class="allocation-legend-color" style="background-color: ${colors[index]}"></div>
                    <span class="allocation-legend-label">${item.label}</span>
                    <span class="allocation-legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }
}

// Update nof0 style leaderboard
function updateLeaderboard() {
    const leaderboardData = generateLeaderboardData();
    updateOverviewStats(leaderboardData);
    updateNof0LeaderboardTable(leaderboardData);
    
    // Only call updateBestModelCard if we have data and the element exists
    if (leaderboardData.length > 0) {
        updateBestModelCard(leaderboardData[0]); // Best performing model
    }
    
    updateAccountInfoChart(leaderboardData);
}

// Update overview statistics
function updateOverviewStats(leaderboardData) {
    if (leaderboardData.length === 0) return;

    // Sort by current value for best/worst determination
    const sortedByValue = [...leaderboardData].sort((a, b) => b.currentValue - a.currentValue);
    const bestModel = sortedByValue[0];
    const worstModel = sortedByValue[sortedByValue.length - 1];
    
    // Calculate total equity
    const totalEquity = leaderboardData.reduce((sum, agent) => sum + agent.currentValue, 0);
    const totalInitialValue = 10000 * leaderboardData.length; // Assuming $10k initial per agent
    const totalReturn = ((totalEquity - totalInitialValue) / totalInitialValue) * 100;
    
    // Update best model
    updateBestModelOverview(bestModel);
    
    // Update total equity
    updateTotalEquityOverview(totalEquity, totalReturn, leaderboardData);
    
    // Update worst model
    updateWorstModelOverview(worstModel);
}

// Update best model overview
function updateBestModelOverview(bestModel) {
    const container = document.getElementById('bestModelOverview');
    if (!container || !bestModel) return;

    container.innerHTML = `
        <div class="stat-model-info">
            <div class="stat-model-icon" style="background-color: ${bestModel.brandColor || '#10b981'}">
                <img src="${bestModel.icon}" alt="${bestModel.displayName}">
            </div>
            <div class="stat-model-name">${bestModel.displayName}</div>
        </div>
        <div class="stat-main-metrics">
            <div class="stat-value">${dataLoader.formatCurrency(bestModel.currentValue)}</div>
            <div class="stat-change ${bestModel.return >= 0 ? 'positive' : 'negative'}">
                ${bestModel.return >= 0 ? '+' : ''}${bestModel.return.toFixed(2)}%
            </div>
        </div>
        <div class="stat-meta">${bestModel.totalTrades} 笔交易 • 夏普比率 ${bestModel.sharpeRatio}</div>
    `;
}

// Update total equity overview
function updateTotalEquityOverview(totalEquity, totalReturn, leaderboardData) {
    const container = document.getElementById('totalEquityOverview');
    if (!container) return;

    // Calculate additional metrics
    const avgReturn = leaderboardData.reduce((sum, agent) => sum + agent.return, 0) / leaderboardData.length;
    const totalTrades = leaderboardData.reduce((sum, agent) => sum + agent.totalTrades, 0);
    const activeModels = leaderboardData.filter(agent => agent.isActive).length;

    // Calculate total profit/loss amount (assuming initial investment was proportional)
    // We need to estimate initial capital based on current values and returns
    let totalInitialCapital = 0;
    leaderboardData.forEach(agent => {
        // Estimate initial capital: currentValue / (1 + return/100)
        const initialValue = agent.currentValue / (1 + agent.return / 100);
        totalInitialCapital += initialValue;
    });
    const totalProfitLoss = totalEquity - totalInitialCapital;

    container.innerHTML = `
        <div class="stat-value">${dataLoader.formatCurrency(totalEquity)}</div>
        <div class="stat-change ${totalReturn >= 0 ? 'positive' : 'negative'}">
            ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}% 总收益
        </div>
        <div class="total-profit-loss ${totalProfitLoss >= 0 ? 'positive' : 'negative'}">
            ${totalProfitLoss >= 0 ? '+' : ''}${dataLoader.formatCurrency(totalProfitLoss)}
        </div>
        <div class="equity-breakdown">
            <div class="equity-item">
                <div class="equity-item-label">平均收益率</div>
                <div class="equity-item-value ${avgReturn >= 0 ? 'stat-change positive' : 'stat-change negative'}">
                    ${avgReturn.toFixed(2)}%
                </div>
            </div>
            <div class="equity-item">
                <div class="equity-item-label">活跃模型</div>
                <div class="equity-item-value">${activeModels}/${leaderboardData.length}</div>
            </div>
            <div class="equity-item">
                <div class="equity-item-label">总交易数</div>
                <div class="equity-item-value">${totalTrades.toLocaleString()}</div>
            </div>
            <div class="equity-item">
                <div class="equity-item-label">总收益额</div>
                <div class="equity-item-value ${totalProfitLoss >= 0 ? 'stat-change positive' : 'stat-change negative'}">
                    ${dataLoader.formatCurrency(totalProfitLoss)}
                </div>
            </div>
        </div>
    `;
}

// Update worst model overview
function updateWorstModelOverview(worstModel) {
    const container = document.getElementById('worstModelOverview');
    if (!container || !worstModel) return;

    container.innerHTML = `
        <div class="stat-model-info">
            <div class="stat-model-icon" style="background-color: ${worstModel.brandColor || '#ef4444'}">
                <img src="${worstModel.icon}" alt="${worstModel.displayName}">
            </div>
            <div class="stat-model-name">${worstModel.displayName}</div>
        </div>
        <div class="stat-main-metrics">
            <div class="stat-value">${dataLoader.formatCurrency(worstModel.currentValue)}</div>
            <div class="stat-change ${worstModel.return >= 0 ? 'positive' : 'negative'}">
                ${worstModel.return >= 0 ? '+' : ''}${worstModel.return.toFixed(2)}%
            </div>
        </div>
        <div class="stat-meta">${worstModel.totalTrades} 笔交易 • 夏普比率 ${worstModel.sharpeRatio}</div>
    `;
}

// Generate leaderboard data from all agents
function generateLeaderboardData() {
    const agents = Object.keys(allAgentsData);
    
    return agents.map(agentName => {
        const data = allAgentsData[agentName];
        const holdings = dataLoader.getCurrentHoldings(agentName);
        const trades = dataLoader.getTradeHistory(agentName);
        
        // Calculate Sharpe ratio (simplified)
        const sharpeRatio = data.return > 0 ? (data.return / 100 * 0.5).toFixed(3) : '0.000';
        
        return {
            name: agentName,
            displayName: dataLoader.getAgentDisplayName(agentName),
            icon: dataLoader.getAgentIcon(agentName),
            return: data.return || 0,
            currentValue: data.currentValue || 0,
            totalTrades: trades.length,
            sharpeRatio: sharpeRatio,
            isActive: holdings && Object.keys(holdings).length > 0,
            brandColor: dataLoader.getAgentBrandColor(agentName)
        };
    }).sort((a, b) => b.currentValue - a.currentValue); // Sort by net value descending
}

// Update nof0 style leaderboard table
function updateNof0LeaderboardTable(leaderboardData) {
    const tableBody = document.getElementById('nof0LeaderboardBody');
    tableBody.innerHTML = '';

    leaderboardData.forEach((agent, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');

        row.innerHTML = `
            <td class="nof0-rank-cell">${rank}</td>
            <td class="nof0-model-cell">
                <div class="nof0-model-icon" style="background-color: ${agent.brandColor || '#666'}">
                    <img src="${agent.icon}" alt="${agent.displayName}">
                </div>
                <span class="nof0-model-name">${agent.displayName}</span>
            </td>
            <td class="nof0-value-cell">
                ${dataLoader.formatCurrency(agent.currentValue)}
            </td>
            <td class="nof0-return-cell ${agent.return >= 0 ? 'positive' : 'negative'}">
                ${dataLoader.formatPercent(agent.return)}
            </td>
            <td class="nof0-trades-cell">
                ${agent.totalTrades}
            </td>
            <td class="nof0-sharpe-cell">
                ${agent.sharpeRatio}
            </td>
        `;

        // Add click handler to load agent portfolio
        row.addEventListener('click', () => {
            document.getElementById('agentSelect').value = agent.name;
            loadAgentPortfolio(agent.name);
        });

        tableBody.appendChild(row);
    });
}

// Update best model card
function updateBestModelCard(bestAgent) {
    const bestModelCard = document.getElementById('bestModelCard');
    
    // Check if the element exists, if not, skip this function
    if (!bestModelCard) {
        console.log('bestModelCard element not found, skipping update');
        return;
    }
    
    if (!bestAgent) {
        bestModelCard.innerHTML = '<p>暂无数据</p>';
        return;
    }

    bestModelCard.innerHTML = `
        <div class="best-model-icon" style="background-color: ${bestAgent.brandColor || '#666'}">
            <img src="${bestAgent.icon}" alt="${bestAgent.displayName}">
        </div>
        <div class="best-model-info">
            <div class="best-model-name">${bestAgent.displayName}</div>
            <div class="best-model-value">${dataLoader.formatCurrency(bestAgent.currentValue)}</div>
        </div>
    `;
}

// Update account info chart with enhanced design
let accountInfoChart = null;
function updateAccountInfoChart(leaderboardData) {
    const ctx = document.getElementById('accountInfoChart');
    if (!ctx) return;

    // Destroy existing chart
    if (accountInfoChart) {
        accountInfoChart.destroy();
    }

    // Update summary statistics
    updateAccountSummaryStats(leaderboardData);

    if (leaderboardData.length === 0) {
        // Show no data message
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        const context = ctx.getContext('2d');
        context.fillStyle = 'var(--gray-400)';
        context.font = '14px var(--font-primary)';
        context.textAlign = 'center';
        context.fillText('暂无账户数据', ctx.width / 2, ctx.height / 2);
        return;
    }

    // Enhanced color palette for consistency
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    const chartData = {
        labels: leaderboardData.map(agent => agent.displayName),
        datasets: [{
            label: '账户价值',
            data: leaderboardData.map(agent => agent.currentValue),
            backgroundColor: leaderboardData.map((agent, index) => colors[index % colors.length]),
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
        }]
    };

    accountInfoChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '各模型账户价值对比',
                    color: 'var(--foreground)',
                    font: {
                        size: 14,
                        weight: '600'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const agent = leaderboardData[context.dataIndex];
                            return [
                                `账户价值: ${dataLoader.formatCurrency(context.parsed.y)}`,
                                `收益率: ${dataLoader.formatPercent(agent.return)}`,
                                `交易数: ${agent.totalTrades}`,
                                `夏普比率: ${agent.sharpeRatio}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'var(--gray-400)',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        maxRotation: 45
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: 'var(--glass-border)',
                        lineWidth: 1
                    },
                    ticks: {
                        color: 'var(--gray-400)',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        callback: function(value) {
                            return dataLoader.formatCurrency(value);
                        }
                    },
                    border: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Update account summary statistics
function updateAccountSummaryStats(leaderboardData) {
    const totalPortfolios = leaderboardData.length;
    const values = leaderboardData.map(agent => agent.currentValue);
    
    // Calculate statistics
    const avgValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    
    // Calculate standard deviation
    const variance = values.length > 0 ? 
        values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length : 0;
    const stdDev = Math.sqrt(variance);
    
    // Count active portfolios (those with holdings)
    const activePortfolios = leaderboardData.filter(agent => agent.isActive).length;
    
    // Update DOM elements with null checks
    const totalPortfoliosEl = document.getElementById('totalPortfolios');
    const avgAccountValueEl = document.getElementById('avgAccountValue');
    const maxAccountValueEl = document.getElementById('maxAccountValue');
    const minAccountValueEl = document.getElementById('minAccountValue');
    const valueStdDevEl = document.getElementById('valueStdDev');
    const activePortfoliosEl = document.getElementById('activePortfolios');
    
    if (totalPortfoliosEl) totalPortfoliosEl.textContent = totalPortfolios;
    if (avgAccountValueEl) avgAccountValueEl.textContent = dataLoader.formatCurrency(avgValue);
    if (maxAccountValueEl) maxAccountValueEl.textContent = dataLoader.formatCurrency(maxValue);
    if (minAccountValueEl) minAccountValueEl.textContent = dataLoader.formatCurrency(minValue);
    if (valueStdDevEl) valueStdDevEl.textContent = dataLoader.formatCurrency(stdDev);
    if (activePortfoliosEl) activePortfoliosEl.textContent = `${activePortfolios}/${totalPortfolios}`;
}

// Update trade history timeline
function updateTradeHistory(agentName) {
    const trades = dataLoader.getTradeHistory(agentName);
    const timeline = document.getElementById('tradeTimeline');
    timeline.innerHTML = '';

    if (trades.length === 0) {
        timeline.innerHTML = '<p style="color: var(--text-muted);">无可用交易历史。</p>';
        return;
    }

    // Show latest 20 trades
    const recentTrades = trades.slice(0, 20);

    recentTrades.forEach(trade => {
        const tradeItem = document.createElement('div');
        tradeItem.className = 'trade-item';

        const icon = trade.action === 'buy' ? '📈' : '📉';
        const iconClass = trade.action === 'buy' ? 'buy' : 'sell';
        const actionText = trade.action === 'buy' ? '买入' : '卖出';

        tradeItem.innerHTML = `
            <div class="trade-icon ${iconClass}">${icon}</div>
            <div class="trade-details">
                <div class="trade-action">${actionText} ${trade.amount} 股 ${trade.symbol}</div>
                <div class="trade-meta">${trade.date}</div>
            </div>
        `;

        timeline.appendChild(tradeItem);
    });
}

// Set up event listeners
function setupEventListeners() {
    const agentSelect = document.getElementById('agentSelect');
    if (agentSelect) {
        agentSelect.addEventListener('change', (e) => {
            loadAgentPortfolio(e.target.value);
        });
    }

    // Market switching buttons
    const usMarketBtn = document.getElementById('usMarketBtn');
    const cnMarketBtn = document.getElementById('cnMarketBtn');
    
    if (usMarketBtn) {
        usMarketBtn.addEventListener('click', () => {
            switchMarket('us');
        });
    }
    
    if (cnMarketBtn) {
        cnMarketBtn.addEventListener('click', () => {
            switchMarket('cn');
        });
    }

    // Leaderboard controls
    setupLeaderboardControls();

    // Scroll to top button
    const scrollBtn = document.getElementById('scrollToTop');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Setup tab controls
function setupLeaderboardControls() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load analysis data when analysis tab is activated
            if (targetTab === 'analysis') {
                updateAnalysisCharts();
            }
        });
    });
}

// Analysis Charts Variables
let returnsComparisonChart = null;
let assetEvolutionChart = null;
let riskReturnChart = null;
let tradingActivityChart = null;
let cumulativeReturnsChart = null;

// Update all analysis charts
function updateAnalysisCharts() {
    const leaderboardData = generateLeaderboardData();
    
    updateReturnsComparisonChart(leaderboardData);
    updateAssetEvolutionChart(leaderboardData);
    updateRiskReturnChart(leaderboardData);
    updateTradingActivityChart(leaderboardData);
    updateCumulativeReturnsChart(leaderboardData);
    updateAnalysisStatsTable(leaderboardData);
}

// Loading overlay controls
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Switch market between US stocks and A-shares
async function switchMarket(market) {
    if (market === currentMarket) return;

    console.log(`Switching market from ${currentMarket} to ${market}`);
    
    // Update market buttons
    document.querySelectorAll('.market-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.market === market);
    });

    // Update current market
    currentMarket = market;
    dataLoader.setMarket(market);
    currentAgent = null; // Reset selected agent

    // Show loading and reload all data
    showLoading();
    
    try {
        // Clear existing data
        allAgentsData = {};
        dataLoader.agentData = {};
        dataLoader.priceCache = {};

        // Load new data for the selected market
        allAgentsData = await dataLoader.loadAllAgentsData();
        console.log('New market data loaded:', Object.keys(allAgentsData));

        // Update UI components
        populateAgentSelector();
        updateMarketDisplay();
        
        // Load first agent by default
        const firstAgent = Object.keys(allAgentsData)[0];
        if (firstAgent) {
            currentAgent = firstAgent;
            await loadAgentPortfolio(firstAgent);
        }

        // Update leaderboard
        updateLeaderboard();

    } catch (error) {
        console.error('Error switching market:', error);
        showError('切换市场失败，请重试');
    } finally {
        hideLoading();
    }
}

// Update market display
function updateMarketDisplay() {
    // Update market buttons
    document.querySelectorAll('.market-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.market === currentMarket);
    });

    // Update page subtitle if needed
    const marketConfig = configLoader.getMarketConfig(currentMarket);
    if (marketConfig) {
        const subtitleElement = document.querySelector('.subtitle');
        if (subtitleElement) {
            subtitleElement.textContent = marketConfig.subtitle;
        }
    }
}

// Show error message
function showError(message) {
    alert(message);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);