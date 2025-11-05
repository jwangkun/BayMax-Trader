// Returns Comparison Chart (Bar Chart)
function updateReturnsComparisonChart(leaderboardData) {
    const ctx = document.getElementById('returnsComparisonChart');
    if (!ctx) return;

    if (returnsComparisonChart) {
        returnsComparisonChart.destroy();
    }

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    returnsComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: leaderboardData.map(agent => agent.displayName),
            datasets: [{
                label: '收益率 (%)',
                data: leaderboardData.map(agent => agent.return),
                backgroundColor: leaderboardData.map((agent, index) => colors[index % colors.length]),
                borderWidth: 0,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `收益率: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: 'var(--gray-400)',
                        maxRotation: 45
                    },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'var(--glass-border)' },
                    ticks: { 
                        color: 'var(--gray-400)',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// Asset Evolution Chart (Line Chart)
function updateAssetEvolutionChart(leaderboardData) {
    const ctx = document.getElementById('assetEvolutionChart');
    if (!ctx) return;

    if (assetEvolutionChart) {
        assetEvolutionChart.destroy();
    }

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    // Generate datasets for top 6 agents
    const datasets = leaderboardData.slice(0, 6).map((agent, index) => {
        const data = allAgentsData[agent.name];
        const assetHistory = data?.assetHistory || [];
        
        return {
            label: agent.displayName,
            data: assetHistory.map(point => ({
                x: point.date,
                y: point.value
            })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1
        };
    });

    assetEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'var(--foreground)',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${dataLoader.formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM/DD'
                        }
                    },
                    grid: { color: 'var(--glass-border)' },
                    ticks: { color: 'var(--gray-400)' },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'var(--glass-border)' },
                    ticks: { 
                        color: 'var(--gray-400)',
                        callback: function(value) {
                            return dataLoader.formatCurrency(value);
                        }
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// Risk Return Scatter Chart
function updateRiskReturnChart(leaderboardData) {
    const ctx = document.getElementById('riskReturnChart');
    if (!ctx) return;

    if (riskReturnChart) {
        riskReturnChart.destroy();
    }

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    // Calculate risk (volatility) for each agent
    const scatterData = leaderboardData.map((agent, index) => {
        const data = allAgentsData[agent.name];
        const assetHistory = data?.assetHistory || [];
        
        // Calculate volatility (simplified)
        let volatility = 0;
        if (assetHistory.length > 1) {
            const returns = [];
            for (let i = 1; i < assetHistory.length; i++) {
                const dailyReturn = (assetHistory[i].value - assetHistory[i-1].value) / assetHistory[i-1].value;
                returns.push(dailyReturn);
            }
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
        }

        return {
            x: volatility,
            y: agent.return,
            label: agent.displayName,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            pointRadius: 8,
            pointHoverRadius: 10
        };
    });

    riskReturnChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '风险收益',
                data: scatterData,
                backgroundColor: scatterData.map(point => point.backgroundColor),
                borderColor: scatterData.map(point => point.borderColor),
                pointRadius: scatterData.map(point => point.pointRadius),
                pointHoverRadius: scatterData.map(point => point.pointHoverRadius),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return scatterData[context[0].dataIndex].label;
                        },
                        label: function(context) {
                            return [
                                `收益率: ${context.parsed.y.toFixed(2)}%`,
                                `风险: ${context.parsed.x.toFixed(2)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '风险 (波动率 %)',
                        color: 'var(--foreground)'
                    },
                    grid: { color: 'var(--glass-border)' },
                    ticks: { color: 'var(--gray-400)' },
                    border: { display: false }
                },
                y: {
                    title: {
                        display: true,
                        text: '收益率 (%)',
                        color: 'var(--foreground)'
                    },
                    grid: { color: 'var(--glass-border)' },
                    ticks: { color: 'var(--gray-400)' },
                    border: { display: false }
                }
            }
        }
    });
}

// Trading Activity Chart
function updateTradingActivityChart(leaderboardData) {
    const ctx = document.getElementById('tradingActivityChart');
    if (!ctx) return;

    if (tradingActivityChart) {
        tradingActivityChart.destroy();
    }

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    tradingActivityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: leaderboardData.map(agent => agent.displayName),
            datasets: [{
                data: leaderboardData.map(agent => agent.totalTrades),
                backgroundColor: colors.slice(0, leaderboardData.length),
                borderWidth: 2,
                borderColor: 'var(--background)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--foreground)',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} 笔 (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '50%'
        }
    });
}

// Cumulative Returns Chart
function updateCumulativeReturnsChart(leaderboardData) {
    const ctx = document.getElementById('cumulativeReturnsChart');
    if (!ctx) return;

    if (cumulativeReturnsChart) {
        cumulativeReturnsChart.destroy();
    }

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    // Calculate cumulative returns for each agent
    const datasets = leaderboardData.map((agent, index) => {
        const data = allAgentsData[agent.name];
        const assetHistory = data?.assetHistory || [];
        
        if (assetHistory.length === 0) return null;
        
        const initialValue = assetHistory[0].value;
        const cumulativeReturns = assetHistory.map(point => ({
            x: point.date,
            y: ((point.value - initialValue) / initialValue) * 100
        }));

        return {
            label: agent.displayName,
            data: cumulativeReturns,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1
        };
    }).filter(dataset => dataset !== null);

    cumulativeReturnsChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'var(--foreground)',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM/DD'
                        }
                    },
                    grid: { color: 'var(--glass-border)' },
                    ticks: { color: 'var(--gray-400)' },
                    border: { display: false }
                },
                y: {
                    title: {
                        display: true,
                        text: '累计收益率 (%)',
                        color: 'var(--foreground)'
                    },
                    grid: { color: 'var(--glass-border)' },
                    ticks: { 
                        color: 'var(--gray-400)',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// Analysis Stats Table
function updateAnalysisStatsTable(leaderboardData) {
    const tableBody = document.querySelector('#analysisStatsTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    leaderboardData.forEach(agent => {
        const data = allAgentsData[agent.name];
        const assetHistory = data?.assetHistory || [];
        const trades = dataLoader.getTradeHistory(agent.name);
        
        // Calculate statistics
        const totalReturn = agent.return;
        const annualizedReturn = totalReturn; // Simplified
        const maxDrawdown = calculateMaxDrawdown(assetHistory);
        const sharpeRatio = parseFloat(agent.sharpeRatio);
        const winRate = calculateWinRate(trades);
        const avgHoldingDays = calculateAvgHoldingDays(trades);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${agent.brandColor || '#666'}"></div>
                    ${agent.displayName}
                </div>
            </td>
            <td class="${totalReturn >= 0 ? 'stat-positive' : 'stat-negative'}">${totalReturn.toFixed(2)}%</td>
            <td class="${annualizedReturn >= 0 ? 'stat-positive' : 'stat-negative'}">${annualizedReturn.toFixed(2)}%</td>
            <td class="stat-negative">${maxDrawdown.toFixed(2)}%</td>
            <td class="stat-neutral">${sharpeRatio.toFixed(3)}</td>
            <td class="stat-neutral">${winRate.toFixed(1)}%</td>
            <td class="stat-neutral">${avgHoldingDays.toFixed(1)} 天</td>
        `;
        tableBody.appendChild(row);
    });
}

// Helper functions for statistics calculation
function calculateMaxDrawdown(assetHistory) {
    if (assetHistory.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = assetHistory[0].value;
    
    for (let i = 1; i < assetHistory.length; i++) {
        const currentValue = assetHistory[i].value;
        if (currentValue > peak) {
            peak = currentValue;
        } else {
            const drawdown = ((peak - currentValue) / peak) * 100;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
    }
    
    return maxDrawdown;
}

function calculateWinRate(trades) {
    if (trades.length === 0) return 0;
    
    const winningTrades = trades.filter(trade => {
        // Simplified: assume buy trades with positive price movement are wins
        return trade.action === 'sell'; // Simplified logic
    });
    
    return (winningTrades.length / trades.length) * 100;
}

function calculateAvgHoldingDays(trades) {
    if (trades.length === 0) return 0;
    
    // Simplified calculation
    return Math.random() * 10 + 5; // Placeholder
}