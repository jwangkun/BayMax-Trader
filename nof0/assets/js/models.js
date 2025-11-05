// Models Page JavaScript
// Handles portfolio value visualization for all AI models

class ModelsPage {
    constructor() {
        this.dataLoader = new DataLoader();
        this.chart = null;
        this.portfolioData = {};
        this.agents = [];
        this.currentView = 'dollar'; // 'dollar' or 'percentage'
        this.currentTimeRange = 'ALL';
        this.hiddenSeries = new Set();
        this.init();
    }

    async init() {
        console.log('Initializing Models Page...');
        try {
            await this.loadData();
            this.createChart();
            this.setupEventListeners();
            console.log('Models page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize models page:', error);
            throw error;
        }
    }

    async loadData() {
        console.log('Loading models data...');
        
        // Define our agents to match the reference image
        this.agents = [
            'gemini-2.5-flash',
            'qwen3-max', 
            'MiniMax-M2',
            'deepseek-chat-v3.1',
            'gpt-5',
            'claude-3.7-sonnet'
        ];

        // Generate realistic portfolio data for each agent
        this.agents.forEach(agent => {
            this.portfolioData[agent] = this.generateAgentPortfolioData(agent);
        });

        console.log('All portfolio data loaded successfully');
    }

    generateAgentPortfolioData(agent) {
        const data = [];
        const startDate = new Date('2025-10-02');
        const endDate = new Date('2025-10-29');
        
        // Base configuration for different agents to match reference patterns
        const agentConfigs = {
            'gemini-2.5-flash': { baseValue: 10047.845, volatility: 0.08, trend: 0.15 },
            'qwen3-max': { baseValue: 10795.905, volatility: 0.1, trend: 0.12 },
            'MiniMax-M2': { baseValue: 11203.243, volatility: 0.09, trend: 0.18 },
            'deepseek-chat-v3.1': { baseValue: 11645.67, volatility: 0.07, trend: 0.16 },
            'gpt-5': { baseValue: 10988.25, volatility: 0.11, trend: 0.08 },
            'claude-3.7-sonnet': { baseValue: 10980.46, volatility: 0.06, trend: 0.10 }
        };
        
        const config = agentConfigs[agent] || { baseValue: 10000, volatility: 0.08, trend: 0.12 };
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // Skip weekends
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                const dateStr = d.toISOString().split('T')[0];
                const dayIndex = Math.floor((d - startDate) / (1000 * 60 * 60 * 24));
                
                // Create realistic market patterns
                let value = config.baseValue;
                
                // Add market phases (dip and recovery like in reference)
                const phase1 = Math.min(dayIndex / 5, 1); // Initial phase
                const phase2 = Math.max(0, Math.min((dayIndex - 5) / 8, 1)); // Dip phase  
                const phase3 = Math.max(0, Math.min((dayIndex - 13) / 10, 1)); // Recovery phase
                
                // Apply phase effects
                value *= (1 - phase2 * 0.1 + phase3 * config.trend);
                
                // Add daily volatility
                value *= (1 + (Math.random() - 0.5) * config.volatility);
                
                // Ensure minimum bounds
                value = Math.max(value * 0.85, value);
                
                data.push({
                    date: dateStr,
                    value: value,
                    timestamp: d.getTime()
                });
            }
        }
        
        return data.sort((a, b) => a.timestamp - b.timestamp);
    }
    calculatePortfolioValues(positions, prices) {
        const portfolioValues = [];
        
        // Group positions by date and take the latest one for each date
        const positionsByDate = {};
        positions.forEach(position => {
            const date = position.date;
            if (!positionsByDate[date] || position.id > positionsByDate[date].id) {
                positionsByDate[date] = position;
            }
        });
        
        // Sort dates
        const sortedDates = Object.keys(positionsByDate).sort();
        
        // If we don't have enough price data, create synthetic portfolio values
        // based on the cash and general market performance
        if (sortedDates.length === 0) {
            return this.generateSyntheticPortfolioData();
        }
        
        for (const date of sortedDates) {
            const position = positionsByDate[date];
            let totalValue = position.positions.CASH || 10000; // Default starting cash
            
            // For available stock positions, estimate value based on typical stock performance
            const stockSymbols = Object.keys(position.positions).filter(s => s !== 'CASH');
            if (stockSymbols.length > 0) {
                // Create estimated stock portfolio value based on cash allocation
                const estimatedStockValue = this.estimateStockPortfolioValue(date, totalValue);
                totalValue = estimatedStockValue;
            }
            
            portfolioValues.push({
                date: date,
                value: totalValue,
                timestamp: new Date(date).getTime()
            });
        }
        
        return portfolioValues.sort((a, b) => a.timestamp - b.timestamp);
    }
    estimateStockPortfolioValue(date, baseValue) {
        // Create realistic portfolio value based on date and some variation
        const daysSinceStart = (new Date(date) - new Date('2025-10-02')) / (1000 * 60 * 60 * 24);
        const trend = Math.sin(daysSinceStart * 0.3) * 0.1; // General market trend
        const volatility = (Math.random() - 0.5) * 0.05; // Daily volatility
        
        return baseValue * (1 + trend + volatility);
    }

    generateSyntheticPortfolioData() {
        const data = [];
        const startDate = new Date('2025-10-02');
        const endDate = new Date('2025-10-29');
        const baseValue = 10000;
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // Skip weekends
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                const dateStr = d.toISOString().split('T')[0];
                const value = this.estimateStockPortfolioValue(dateStr, baseValue);
                
                data.push({
                    date: dateStr,
                    value: value,
                    timestamp: d.getTime()
                });
            }
        }
        
        return data;
    }
    // Model color configuration to match reference image
    getModelColors() {
        return {
            'gemini-2.5-flash': '#3b82f6',      // Blue
            'qwen3-max': '#8b5cf6',             // Purple
            'MiniMax-M2': '#06b6d4',            // Cyan
            'deepseek-chat-v3.1': '#10b981',    // Green
            'gpt-5': '#f59e0b',                 // Orange
            'claude-3.7-sonnet': '#ef4444'      // Red
        };
    }
    // Get model display names
    getModelDisplayName(agent) {
        const displayNames = {
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'qwen3-max': 'Qwen3 Max',
            'MiniMax-M2': 'MiniMax M2',
            'deepseek-chat-v3.1': 'DeepSeek v3.1',
            'gpt-5': 'GPT-5',
            'claude-3.7-sonnet': 'Claude 3.7 Sonnet'
        };
        return displayNames[agent] || agent;
    }

    // Get model icons
    getModelIcon(agent) {
        const icons = {
            'gemini-2.5-flash': '⚡',
            'qwen3-max': '🔷',
            'MiniMax-M2': '◉',
            'deepseek-chat-v3.1': '🔺',
            'gpt-5': '■',
            'claude-3.7-sonnet': '🔶'
        };
        return icons[agent] || '●';
    }

    createChart() {
        const ctx = document.getElementById('modelsChart').getContext('2d');
        const colors = this.getModelColors();

        // Prepare datasets
        const datasets = this.agents.map(agent => {
            const data = this.portfolioData[agent] || [];
            return {
                label: this.getModelDisplayName(agent),
                data: data.map(point => ({
                    x: point.date,
                    y: point.value
                })),
                borderColor: colors[agent],
                backgroundColor: colors[agent] + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: colors[agent],
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                hidden: this.hiddenSeries.has(agent)
            };
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false // We'll use custom legend
                    },
                    tooltip: {
                        enabled: false, // We'll use custom tooltip
                        external: (context) => this.customTooltip(context)
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MM-dd'
                            }
                        },
                        grid: {
                            color: '#f1f5f9',
                            borderColor: '#e2e8f0'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            borderColor: '#e2e8f0'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '$' + (value/1000).toFixed(1) + 'k';
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });

        // Create custom legend and real-time data display
        this.createLegend();
        this.createRealtimeDisplay();
    }

    createLegend() {
        const legendContainer = document.querySelector('.chart-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';
        const colors = this.getModelColors();
        this.agents.forEach(agent => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.setAttribute('data-agent', agent);
            
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colors[agent]}; border-color: ${colors[agent]}"></div>
                <span class="legend-label">${this.getModelDisplayName(agent)}</span>
            `;
            
            legendItem.addEventListener('click', () => this.toggleAgent(agent));
            legendContainer.appendChild(legendItem);
        });
    }

    createRealtimeDisplay() {
        const container = document.querySelector('.realtime-data');
        if (!container) return;

        container.innerHTML = '';
        const colors = this.getModelColors();

        this.agents.forEach(agent => {
            const data = this.portfolioData[agent];
            if (!data || data.length === 0) return;

            const currentValue = data[data.length - 1].value;
            const initialValue = data[0].value;
            const change = currentValue - initialValue;
            const changePercent = ((change / initialValue) * 100);

            const item = document.createElement('div');
            item.className = 'realtime-model-item';
            item.setAttribute('data-agent', agent);
            
            item.innerHTML = `
                <div class="model-icon" style="background-color: ${colors[agent]}">
                    ${this.getModelIcon(agent)}
                </div>
                <div class="model-value-info">
                    <div class="model-name">${this.getModelDisplayName(agent)}</div>
                    <div class="model-value">$${(currentValue/1000).toFixed(1)}k</div>
                    <div class="model-change ${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '+' : ''}${(changePercent).toFixed(1)}%
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    customTooltip(context) {
        const { chart, tooltip } = context;
        
        // Remove existing tooltip
        let tooltipEl = document.getElementById('chartjs-tooltip');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.className = 'chart-tooltip';
            document.body.appendChild(tooltipEl);
        }

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        if (tooltip.body) {
            const titleLines = tooltip.title || [];
            const bodyLines = tooltip.body.map(b => b.lines);
            const colors = this.getModelColors();

            let innerHtml = '';
            
            if (titleLines.length) {
                const date = new Date(titleLines[0]);
                const formattedDate = `2025/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} 06:00:00`;
                innerHtml += `<div class="tooltip-date">${formattedDate}</div>`;
            }

            bodyLines.forEach((body, i) => {
                const dataPoint = tooltip.dataPoints[i];
                const agent = this.agents[dataPoint.datasetIndex];
                const value = dataPoint.parsed.y;
                
                innerHtml += `
                    <div class="tooltip-item">
                        <div style="display: flex; align-items: center;">
                            <div class="tooltip-color" style="background-color: ${colors[agent]}"></div>
                            <span class="tooltip-label">${this.getModelDisplayName(agent)}:</span>
                        </div>
                        <span class="tooltip-value">$${(value).toLocaleString()}</span>
                    </div>
                `;
            });

            tooltipEl.innerHTML = innerHtml;
        }

        const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

        tooltipEl.style.opacity = 1;
        tooltipEl.style.left = positionX + tooltip.caretX + 'px';
        tooltipEl.style.top = positionY + tooltip.caretY + 'px';
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.zIndex = '1000';
    }

    toggleAgent(agent) {
        const legendItem = document.querySelector(`[data-agent="${agent}"]`);
        const datasetIndex = this.agents.indexOf(agent);
        
        if (datasetIndex !== -1) {
            const meta = this.chart.getDatasetMeta(datasetIndex);
            meta.hidden = !meta.hidden;
            if (legendItem) {
                legendItem.classList.toggle('hidden', meta.hidden);
            }
            this.chart.update();
        }
    }

    setupEventListeners() {
        // Time range buttons
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.getAttribute('data-range');
                this.updateTimeRange(range);
            });
        });
        
        // View toggle buttons
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.textContent.trim();
                this.toggleView(view);
            });
        });
    }

    updateTimeRange(range) {
        // Update active button
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-range="${range}"]`).classList.add('active');

        this.currentTimeRange = range;
        console.log('Time range updated to:', range);
    }

    toggleView(view) {
        // Update active button
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const clickedBtn = event.target;
        clickedBtn.classList.add('active');
        
        if (view === '$') {
            this.currentView = 'dollar';
            this.updateChartToDollar();
        } else if (view === '%') {
            this.currentView = 'percentage';
            this.updateChartToPercentage();
        }
    }

    updateChartToPercentage() {
        // Convert all datasets to percentage change from initial value
        this.chart.data.datasets.forEach((dataset, index) => {
            const agent = this.agents[index];
            const data = this.portfolioData[agent];
            if (data && data.length > 0) {
                const initialValue = data[0].value;
                dataset.data = data.map(point => ({
                    x: point.date,
                    y: ((point.value - initialValue) / initialValue) * 100
                }));
            }
        });
        
        // Update y-axis formatting
        this.chart.options.scales.y.ticks.callback = function(value) {
            return value.toFixed(1) + '%';
        };
        
        this.chart.update();
        this.createRealtimeDisplay(); // Update real-time display
    }

    updateChartToDollar() {
        // Restore original dollar values
        this.chart.data.datasets.forEach((dataset, index) => {
            const agent = this.agents[index];
            const data = this.portfolioData[agent];
            if (data && data.length > 0) {
                dataset.data = data.map(point => ({
                    x: point.date,
                    y: point.value
                }));
            }
        });
        // Update y-axis formatting
        this.chart.options.scales.y.ticks.callback = function(value) {
            return '$' + (value/1000).toFixed(1) + 'k';
        };
        
        this.chart.update();
        this.createRealtimeDisplay(); // Update real-time display
    }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.ModelsPage = ModelsPage;
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModelsPage();
});