// NOF0 Chart Manager - Enhanced for NOF0 interface
class Nof0ChartManager {
    constructor() {
        this.chart = null;
        this.currentTimeRange = 'all';
        this.currentValueMode = 'dollar';
        this.agentsData = {};
        this.iconCache = {};
        this.selectedAgent = null; // 当前选中的代理
        this.colors = {
            'claude-3.7-sonnet': '#ff6b35',
            'deepseek-chat-v3.1': '#4d6bfe',
            'gemini-2.5-flash': '#4285f4',
            'gpt-5': '#10a37f',
            'MiniMax-M2': '#8b5cf6',
            'qwen3-max': '#f59e0b'
        };
        this.iconPaths = {
            'claude-3.7-sonnet': 'figs/claude-color.svg',
            'deepseek-chat-v3.1': 'figs/deepseek.svg',
            'gemini-2.5-flash': 'figs/google.svg',
            'gpt-5': 'figs/openai.svg',
            'MiniMax-M2': 'figs/minimax.svg',
            'qwen3-max': 'figs/qwen.svg'
        };
    }

    async init(agentsData) {
        try {
            this.agentsData = agentsData;
            await this.preloadIcons();
            this.createChart();
            this.updateLegend();
        } catch (error) {
            console.error('Failed to initialize chart:', error);
        }
    }

    // 重新初始化图表（用于数据刷新）
    async reinit(agentsData) {
        try {
            console.log('Reinitializing chart with new data...');
            this.agentsData = agentsData;
            
            // 保持当前的选择状态
            const currentSelection = this.selectedAgent;
            
            // 如果图表已存在，先销毁
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            // 恢复选择状态
            this.selectedAgent = currentSelection;
            
            // 重新创建图表
            this.createChart();
            this.updateLegend();
            
            console.log('✅ Chart reinitialized successfully');
        } catch (error) {
            console.error('❌ Failed to reinitialize chart:', error);
        }
    }

    async preloadIcons() {
        const iconPromises = Object.entries(this.iconPaths).map(([agentName, iconPath]) => {
            return this.loadSVGAsImage(agentName, iconPath);
        });

        await Promise.all(iconPromises);
        console.log('Icons preloaded:', Object.keys(this.iconCache));
    }
    async loadSVGAsImage(agentName, iconPath) {
        try {
            // Fetch SVG content
            const response = await fetch(iconPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${iconPath}`);
            }
            
            const svgText = await response.text();
            
            // Create a blob URL from SVG
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            // Load as image
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.iconCache[agentName] = img;
                    URL.revokeObjectURL(url); // Clean up
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load icon for ${agentName}: ${iconPath}`);
                    URL.revokeObjectURL(url); // Clean up
                    resolve(); // Don't fail the whole process
                };
                img.src = url;
            });
        } catch (error) {
            console.warn(`Error loading SVG for ${agentName}:`, error);
        }
    }

    createChart() {
        const ctx = document.getElementById('assetChart');
        if (!ctx) return;

        const datasets = this.prepareDatasets();

        // Create a reference to this for use in plugin
        const chartManager = this;

        // 计算Y轴的固定范围
        const yAxisRange = this.calculateYAxisRange();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        right: 120, // Increased padding for icons and labels
                        top: 20,
                        bottom: 10
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: true,
                },
                onClick: (event, elements) => {
                    // 处理图表点击事件
                    this.handleChartClick(event, elements);
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        filter: function(tooltipItem) {
                            // 只显示当前鼠标悬停的数据点
                            return true;
                        },
                        callbacks: {
                            title: (context) => {
                                if (context.length === 0) return '';
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                }) + ' ' + date.toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const value = this.currentValueMode === 'dollar' 
                                    ? `$${context.parsed.y.toLocaleString()}`
                                    : `${context.parsed.y.toFixed(2)}%`;
                                return `${context.dataset.label}: ${value}`;
                            },
                            beforeBody: () => {
                                // 确保只显示一个数据点
                                return [];
                            }
                        }
                    }
                },
                animation: {
                    onComplete: () => {
                        // Add a small delay to ensure chart is fully rendered
                        setTimeout(() => {
                            this.drawAgentIcons();
                        }, 100);
                    },
                    onProgress: () => {
                        // Also draw icons during animation to keep them visible
                        setTimeout(() => {
                            this.drawAgentIcons();
                        }, 50);
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                hour: 'MM-DD HH:mm',
                                day: 'MM-DD',
                                week: 'MM-DD',
                                month: 'MM-DD'
                            },
                            tooltipFormat: 'YYYY-MM-DD HH:mm'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            maxTicksLimit: 8,
                            callback: function(value, index, values) {
                                const date = new Date(value);
                                return date.toLocaleDateString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit'
                                });
                            }
                        }
                    },
                    y: {
                        min: yAxisRange.min,
                        max: yAxisRange.max,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            callback: (value) => {
                                return this.currentValueMode === 'dollar'
                                    ? `$${value.toLocaleString()}`
                                    : `${value.toFixed(1)}%`;
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.1,
                        borderWidth: 2
                    },
                    point: {
                        radius: 0,
                        hoverRadius: 6,
                        hitRadius: 10
                    }
                }
            },
            plugins: [{
                id: 'agentIconsPlugin',
                afterDraw: (chart) => {
                    console.log('agentIconsPlugin.afterDraw called');
                    // Ensure this context is properly bound
                    setTimeout(() => {
                        console.log('Calling drawAgentIcons from plugin');
                        chartManager.drawAgentIcons();
                    }, 10);
                }
            }]
        });

        // Also draw icons after chart creation
        setTimeout(() => {
            console.log('Drawing icons after chart creation timeout');
            this.drawAgentIcons();
        }, 200);
    }
    prepareDatasets() {
        const datasets = [];
        Object.entries(this.agentsData).forEach(([agentName, agentData]) => {
            if (!agentData || !agentData.assetHistory || agentData.assetHistory.length === 0) return;

            const data = agentData.assetHistory.map(item => {
                let value;
                if (this.currentValueMode === 'dollar') {
                    value = item.value;
                } else {
                    // Calculate percentage change from initial value
                    const initialValue = agentData.assetHistory[0].value;
                    value = ((item.value - initialValue) / initialValue) * 100;
                }

                return {
                    x: new Date(item.date),
                    y: value
                };
            });

            // Filter data based on time range
            const filteredData = this.filterDataByTimeRange(data);

            // 根据选中状态设置样式
            const isSelected = this.selectedAgent === null || this.selectedAgent === agentName;
            const baseColor = this.colors[agentName] || this.generateColor(agentName);
            
            datasets.push({
                label: this.getAgentDisplayName(agentName),
                data: filteredData,
                borderColor: isSelected ? baseColor : baseColor + '40', // 未选中时透明度降低
                backgroundColor: (baseColor) + '20',
                fill: false,
                tension: 0.1,
                borderWidth: isSelected ? 3 : 1, // 选中时线条更粗
                pointRadius: isSelected ? 2 : 0, // 选中时显示点
                pointHoverRadius: isSelected ? 8 : 6,
                agentName: agentName // 添加代理名称用于识别
            });
        });

        return datasets;
    }

    filterDataByTimeRange(data) {
        if (this.currentTimeRange === 'all') {
            return data;
        }

        const now = new Date();
        const hours = parseInt(this.currentTimeRange.replace('h', ''));
        const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

        return data.filter(point => {
            const pointDate = point.x instanceof Date ? point.x : new Date(point.x);
            return pointDate >= cutoffTime;
        });
    }
    getAgentDisplayName(agentName) {
        const displayNames = {
            'claude-3.7-sonnet': 'Claude 3.7 Sonnet',
            'deepseek-chat-v3.1': 'DeepSeek v3.1',
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'gpt-5': 'GPT-5',
            'MiniMax-M2': 'MiniMax M2',
            'qwen3-max': 'Qwen3 Max'
        };
        return displayNames[agentName] || agentName;
    }

    generateColor(agentName) {
        // Generate a consistent color based on agent name
        let hash = 0;
        for (let i = 0; i < agentName.length; i++) {
            hash = agentName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    setTimeRange(range) {
        this.currentTimeRange = range;
        this.updateChart();
    }

    setValueMode(mode) {
        this.currentValueMode = mode;
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;
        
        // 重新计算Y轴范围
        const yAxisRange = this.calculateYAxisRange();
        this.chart.options.scales.y.min = yAxisRange.min;
        this.chart.options.scales.y.max = yAxisRange.max;
        
        const datasets = this.prepareDatasets();
        this.chart.data.datasets = datasets;
        this.chart.update('none').then(() => {
            // Draw icons after chart update
            this.drawAgentIcons();
        });
        
        // 更新图例
        this.updateLegend();
    }

    updateLegend() {
        const legendContainer = document.getElementById('chartLegend');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';

        // 添加"全部"选项
        const allItem = document.createElement('div');
        const isAllSelected = this.selectedAgent === null;
        allItem.className = `legend-chip ${isAllSelected ? 'selected' : ''}`;
        allItem.style.cursor = 'pointer';
        
        allItem.innerHTML = `
            <div class="legend-chip-color" style="background-color: #ffffff;"></div>
            <span class="legend-chip-name">全部</span>
        `;
        
        // 添加点击事件
        allItem.addEventListener('click', () => {
            this.selectedAgent = null;
            this.updateChart();
        });
        
        legendContainer.appendChild(allItem);

        // 添加各个代理
        Object.keys(this.agentsData).forEach(agentName => {
            const legendItem = document.createElement('div');
            const isSelected = this.selectedAgent === agentName;
            legendItem.className = `legend-chip ${isSelected ? 'selected' : ''}`;
            legendItem.style.cursor = 'pointer';
            
            const color = this.colors[agentName] || this.generateColor(agentName);
            const displayName = this.getAgentDisplayName(agentName);
            
            // 获取当前模型的实时金额和盈亏状态
            const agentData = this.agentsData[agentName];
            let currentValue = '$0';
            let profitClass = '';
            if (agentData && agentData.assetHistory && agentData.assetHistory.length > 0) {
                const lastValue = agentData.assetHistory[agentData.assetHistory.length - 1].value;
                const initialValue = agentData.assetHistory[0].value;
                currentValue = `$${Math.round(lastValue).toLocaleString()}`;
                
                // 判断盈亏状态
                if (lastValue > initialValue) {
                    profitClass = 'profit';
                } else if (lastValue < initialValue) {
                    profitClass = 'loss';
                }
            }
            
            legendItem.innerHTML = `
                <div class="legend-chip-icon" style="background-color: ${color}20; border: 1px solid ${color}40;">
                    <img src="${this.iconPaths[agentName]}" alt="${displayName}" onerror="this.style.display='none'">
                </div>
                <div class="legend-chip-info">
                    <span class="legend-chip-name">${displayName}</span>
                    <span class="legend-chip-value ${profitClass}">${currentValue}</span>
                </div>
            `;
            
            // 添加点击事件
            legendItem.addEventListener('click', () => {
                this.toggleAgentSelection(agentName);
            });
            
            legendContainer.appendChild(legendItem);
        });
    }

    drawAgentIcons() {
        if (!this.chart) {
            console.log('Chart not ready for icon drawing');
            return;
        }

        const canvas = this.chart.canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Canvas context not available');
            return;
        }

        console.log('Drawing agent icons, cached icons:', Object.keys(this.iconCache));
        console.log('Agents data keys:', Object.keys(this.agentsData));

        // Get the latest data point for each agent
        Object.entries(this.agentsData).forEach(([agentName, agentData]) => {
            if (!agentData || !agentData.assetHistory || agentData.assetHistory.length === 0) {
                console.log(`No assetHistory for agent: ${agentName}`);
                return;
            }

            const latestDataPoint = agentData.assetHistory[agentData.assetHistory.length - 1];
            console.log(`Latest data point for ${agentName}:`, latestDataPoint);

            // Convert data point to chart coordinates
            const chartData = this.chart.data.datasets.find(dataset => dataset.label === this.getAgentDisplayName(agentName));
            if (!chartData || chartData.data.length === 0) {
                console.log(`No chart dataset found for agent: ${agentName}`);
                return;
            }

            console.log(`Chart dataset found for ${agentName}:`, chartData);
            console.log(`Chart data points count: ${chartData.data.length}`);
            console.log(`First chart point:`, chartData.data[0]);
            console.log(`Last chart point:`, chartData.data[chartData.data.length - 1]);

            // Get the pixel coordinates for the latest point
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;

            if (!xScale || !yScale) {
                console.log('Chart scales not available');
                return;
            }

            console.log(`Converting coordinates for ${agentName}:`);
            console.log(`Latest data point:`, latestDataPoint);
            console.log(`Chart data points:`, chartData.data);

            // Convert the latest data point date to Date object for comparison
            const latestDataDate = new Date(latestDataPoint.date);

            // Find the matching chart point by comparing dates
            const latestChartPointIndex = chartData.data.findIndex(point => {
                if (!point || !point.x) {
                    console.log('Point or point.x is undefined:', point);
                    return false;
                }
                
                // Add more detailed debugging
                console.log('Point.x type:', typeof point.x, 'Value:', point.x);
                
                let pointDate;
                try {
                    if (point.x instanceof Date) {
                        pointDate = point.x;
                    } else if (typeof point.x === 'string' || typeof point.x === 'number') {
                        pointDate = new Date(point.x);
                    } else {
                        console.error('Unexpected point.x type:', typeof point.x, point.x);
                        return false;
                    }
                    
                    if (isNaN(pointDate.getTime())) {
                        console.error('Invalid date created from point.x:', point.x);
                        return false;
                    }
                    
                    const match = pointDate.getTime() === latestDataDate.getTime();
                    console.log(`Comparing ${pointDate.getTime()} with ${latestDataDate.getTime()}: ${match}`);
                    return match;
                } catch (error) {
                    console.error('Error processing point.x:', error, point);
                    return false;
                }
            });

            if (latestChartPointIndex === -1) {
                console.log(`No matching chart point found for agent: ${agentName}`);
                console.log(`Looking for date: ${latestDataDate.toISOString()}`);
                // Use the last point in the chart data as fallback
                const lastChartPoint = chartData.data[chartData.data.length - 1];
                if (lastChartPoint) {
                    console.log(`Using last chart point as fallback:`, lastChartPoint);
                    // Ensure lastChartPoint.x is a Date object for time scale
                    const lastPointDate = lastChartPoint.x instanceof Date ? lastChartPoint.x : new Date(lastChartPoint.x);
                    const pixelX = xScale.getPixelForValue(lastPointDate);
                    const pixelY = yScale.getPixelForValue(lastChartPoint.y);
                    console.log(`Fallback coordinates for ${agentName}: (${pixelX}, ${pixelY})`);

                    // Create coordinate object for drawAgentIcon
                    const latestPoint = { x: pixelX, y: pixelY };
                    this.drawAgentIcon(ctx, agentName, latestPoint);
                }
                return;
            }

            const pixelX = xScale.getPixelForValue(latestDataDate);
            const pixelY = yScale.getPixelForValue(chartData.data[latestChartPointIndex].y);
            console.log(`Converted coordinates for ${agentName}: (${pixelX}, ${pixelY})`);

            // Create coordinate object for drawAgentIcon
            const latestPoint = { x: pixelX, y: pixelY };
            this.drawAgentIcon(ctx, agentName, latestPoint);
        });
    }
    drawAgentIcon(ctx, agentName, latestPoint) {
        console.log(`drawAgentIcon called for ${agentName} at position:`, latestPoint);

        const icon = this.iconCache[agentName];
        if (!icon) {
            console.log(`Icon not found in cache for agent: ${agentName}`);
            console.log('Available icons in cache:', Object.keys(this.iconCache));
            return;
        }

        console.log(`Drawing icon for ${agentName} with image:`, icon);

        ctx.save();

        // Icon size and position
        const iconSize = 28;
        const circleRadius = iconSize / 2 + 6;
        const iconCenterX = latestPoint.x + 22;
        const iconCenterY = latestPoint.y;

        console.log(`Icon position: center=(${iconCenterX}, ${iconCenterY}), size=${iconSize}, radius=${circleRadius}`);

        // Draw outer glow effect
        ctx.shadowColor = this.colors[agentName];
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw main circle background
        ctx.fillStyle = this.colors[agentName];
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        console.log(`Drawn outer circle at (${iconCenterX}, ${iconCenterY}) with radius ${circleRadius}`);

        // Reset shadow for inner elements
        ctx.shadowBlur = 0;

        // Draw inner white circle for icon background
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, circleRadius - 3, 0, Math.PI * 2);
        ctx.fill();
        console.log(`Drawn inner white circle at (${iconCenterX}, ${iconCenterY}) with radius ${circleRadius - 3}`);

        // Create circular clipping path for icon
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, iconSize / 2, 0, Math.PI * 2);
        ctx.clip();
        console.log(`Created clipping path at (${iconCenterX}, ${iconCenterY}) with radius ${iconSize / 2}`);

        // Draw the icon
        const iconX = iconCenterX - iconSize / 2;
        const iconY = iconCenterY - iconSize / 2;
        console.log(`Drawing icon at (${iconX}, ${iconY}) with size ${iconSize}`);
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
        console.log(`Icon drawn successfully for ${agentName}`);

        ctx.restore();

        // Draw value label next to icon
        this.drawValueLabel(ctx, iconCenterX + circleRadius + 8, iconCenterY, agentName, this.colors[agentName]);
        console.log(`Value label drawn for ${agentName}`);
    }
    drawValueLabel(ctx, x, y, agentName, borderColor) {
        const agentData = this.agentsData[agentName];
        if (!agentData || !agentData.assetHistory || agentData.assetHistory.length === 0) return;

        const lastValue = agentData.assetHistory[agentData.assetHistory.length - 1].value;
        const initialValue = agentData.assetHistory[0].value;
        
        let valueText, displayName;
        if (this.currentValueMode === 'dollar') {
            valueText = `$${Math.round(lastValue).toLocaleString()}`;
        } else {
            const percentage = ((lastValue - initialValue) / initialValue * 100);
            valueText = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        }
        
        displayName = this.getAgentDisplayName(agentName);

        ctx.save();

        // Set font for measurements
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const valueMetrics = ctx.measureText(valueText);
        
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const nameMetrics = ctx.measureText(displayName);
        
        const maxWidth = Math.max(valueMetrics.width, nameMetrics.width);
        const padding = 10;
        const rectWidth = maxWidth + padding * 2;
        const rectHeight = 28;
        
        const rectX = x;
        const rectY = y - rectHeight / 2;
        // Draw rounded rectangle background with border
        ctx.fillStyle = borderColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        this.drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw value text (bold, larger)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, rectX + rectWidth / 2, y - 4);

        // Draw agent name (smaller, below value)
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(displayName, rectX + rectWidth / 2, y + 6);

        ctx.restore();
    }
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // 计算Y轴固定范围
    calculateYAxisRange() {
        let allValues = [];
        
        Object.entries(this.agentsData).forEach(([agentName, agentData]) => {
            if (!agentData || !agentData.assetHistory || agentData.assetHistory.length === 0) return;

            const data = agentData.assetHistory.map(item => {
                if (this.currentValueMode === 'dollar') {
                    return item.value;
                } else {
                    const initialValue = agentData.assetHistory[0].value;
                    return ((item.value - initialValue) / initialValue) * 100;
                }
            });

            const filteredData = this.filterDataByTimeRange(data.map((value, index) => ({
                x: new Date(agentData.assetHistory[index].date),
                y: value
            }))).map(item => item.y);

            allValues = allValues.concat(filteredData);
        });

        if (allValues.length === 0) {
            return { min: 0, max: 100 };
        }

        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const range = maxValue - minValue;
        const padding = range * 0.1; // 10% 的边距

        return {
            min: minValue - padding,
            max: maxValue + padding
        };
    }

    // 处理图表点击事件
    handleChartClick(event, elements) {
        if (elements.length > 0) {
            const element = elements[0];
            const datasetIndex = element.datasetIndex;
            const dataset = this.chart.data.datasets[datasetIndex];
            const agentName = dataset.agentName;
            
            if (agentName) {
                this.toggleAgentSelection(agentName);
            }
        } else {
            // 点击空白区域，取消所有选择
            this.selectedAgent = null;
            this.updateChart();
        }
    }

    // 切换代理选择状态
    toggleAgentSelection(agentName) {
        if (this.selectedAgent === agentName) {
            // 如果当前代理已选中，则取消选择
            this.selectedAgent = null;
        } else {
            // 选择新的代理
            this.selectedAgent = agentName;
        }
        
        console.log('Selected agent:', this.selectedAgent);
        this.updateChart();
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}