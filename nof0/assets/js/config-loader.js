// Configuration Loader Utility
// Handles loading and processing configuration files

class ConfigLoader {
    constructor() {
        this.config = null;
        this.basePath = './data';
    }

    async loadConfig() {
        try {
            const response = await fetch('data/config.yaml');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            
            const yamlText = await response.text();
            this.config = this.parseYAML(yamlText);
            
            console.log('✅ Configuration loaded successfully');
            return this.config;
        } catch (error) {
            console.error('❌ Error loading configuration, using default:', error);
            // Fallback to default configuration
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }

    parseYAML(yamlText) {
        // Simple YAML parser for our specific use case
        const lines = yamlText.split('\n');
        const config = { markets: {} };
        let currentSection = null;
        let currentMarket = null;
        let indentStack = [];

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const indent = line.match(/^(\s*)/)[1].length;
            const isKey = line.includes(':');
            
            if (isKey) {
                const [key, value] = line.split(':').map(s => s.trim());
                
                // Handle market sections
                if (key === 'us' || key === 'cn') {
                    currentMarket = key;
                    config.markets[key] = { agents: [] };
                    currentSection = null;
                    indentStack = [{ indent, key }];
                    continue;
                }
                
                // Handle nested keys
                const currentIndent = indentStack[indentStack.length - 1];
                if (currentIndent && indent > currentIndent.indent) {
                    if (key === 'agents') {
                        currentSection = 'agents';
                    }
                } else {
                    // Pop from stack if we're going back
                    while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= indent) {
                        indentStack.pop();
                    }
                    currentSection = null;
                }
                
                indentStack.push({ indent, key });
                
                // Set values
                if (currentMarket && currentSection === 'agents') {
                    if (key === '-') {
                        // New agent entry
                        const agent = this.parseAgentEntry(lines, lines.indexOf(line));
                        if (agent) {
                            config.markets[currentMarket].agents.push(agent);
                        }
                    }
                } else if (currentMarket) {
                    config.markets[currentMarket][key] = value || true;
                } else {
                    config[key] = value || true;
                }
            }
        }

        return config;
    }

    parseAgentEntry(lines, startIndex) {
        const agent = {};
        let i = startIndex + 1;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line) break;
            
            const indent = line.match(/^(\s*)/)[1].length;
            if (indent === 0) break;
            
            if (line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());
                agent[key] = value;
            }
            i++;
        }
        
        return Object.keys(agent).length > 0 ? agent : null;
    }

    getDefaultConfig() {
        return {
            markets: {
                us: {
                    name: "US Market (Nasdaq-100)",
                    subtitle: "Track how different AI models perform in Nasdaq-100 stock trading",
                    data_dir: "agent_data",
                    benchmark_file: "Adaily_prices_QQQ.json",
                    benchmark_name: "QQQ",
                    benchmark_display_name: "QQQ Invesco",
                    currency: "USD",
                    icon: "🇺🇸",
                    price_data_type: "individual",
                    time_granularity: "hourly",
                    enabled: true,
                    agents: [
                        { folder: "gemini-2.5-flash", display_name: "Gemini 2.5 Flash", icon: "./figs/google.svg", color: "#8A2BE2", enabled: true },
                        { folder: "qwen3-max", display_name: "Qwen3 Max", icon: "./figs/qwen.svg", color: "#0066ff", enabled: true },
                        { folder: "deepseek-chat-v3.1", display_name: "DeepSeek Chat v3.1", icon: "./figs/deepseek.svg", color: "#4a90e2", enabled: true },
                        { folder: "gpt-5", display_name: "GPT-5", icon: "./figs/openai.svg", color: "#10a37f", enabled: true },
                        { folder: "claude-3.7-sonnet", display_name: "Claude 3.7 Sonnet", icon: "./figs/claude-color.svg", color: "#cc785c", enabled: true },
                        { folder: "MiniMax-M2", display_name: "MiniMax M2", icon: "./figs/minimax.svg", color: "#ff0000", enabled: true }
                    ]
                },
                cn: {
                    name: "A-Shares (SSE 50)",
                    subtitle: "Track how different AI models perform in SSE 50 A-share stock trading",
                    data_dir: "agent_data_astock",
                    benchmark_file: "A_stock/index_daily_sse_50.json",
                    benchmark_name: "SSE 50",
                    benchmark_display_name: "SSE 50 Index",
                    currency: "CNY",
                    icon: "🇨🇳",
                    price_data_type: "merged",
                    time_granularity: "daily",
                    enabled: true,
                    agents: [
                        { folder: "gemini-2.5-flash", display_name: "Gemini 2.5 Flash", icon: "./figs/google.svg", color: "#8A2BE2", enabled: true },
                        { folder: "qwen3-max", display_name: "Qwen3 Max", icon: "./figs/qwen.svg", color: "#0066ff", enabled: true },
                        { folder: "deepseek-chat-v3.1", display_name: "DeepSeek Chat v3.1", icon: "./figs/deepseek.svg", color: "#4a90e2", enabled: true },
                        { folder: "gpt-5", display_name: "GPT-5", icon: "./figs/openai.svg", color: "#10a37f", enabled: true },
                        { folder: "claude-3.7-sonnet", display_name: "Claude 3.7 Sonnet", icon: "./figs/claude-color.svg", color: "#cc785c", enabled: true },
                        { folder: "MiniMax-M2", display_name: "MiniMax M2", icon: "./figs/minimax.svg", color: "#ff0000", enabled: true }
                    ]
                }
            },
            data: {
                base_path: "./data",
                price_file_prefix: "daily_prices_",
                benchmark_file: "Adaily_prices_QQQ.json"
            },
            benchmark: {
                folder: "QQQ",
                display_name: "QQQ Invesco",
                icon: "./figs/stock.svg",
                color: "#ff6b00",
                enabled: true
            },
            chart: {
                default_scale: "linear",
                max_ticks: 15,
                point_radius: 0,
                point_hover_radius: 7,
                border_width: 3,
                tension: 0.42
            },
            ui: {
                initial_value: 10000,
                max_recent_trades: 20,
                date_formats: {
                    hourly: "MM/DD HH:mm",
                    daily: "YYYY-MM-DD"
                }
            }
        };
    }

    getMarketConfig(market) {
        if (!this.config) {
            console.warn('Config not loaded yet');
            return null;
        }
        return this.config.markets[market] || null;
    }

    getEnabledAgents(market) {
        const marketConfig = this.getMarketConfig(market);
        if (!marketConfig) return [];
        
        return marketConfig.agents.filter(agent => agent.enabled === 'true' || agent.enabled === true);
    }

    getDisplayName(agentName, market) {
        const marketConfig = this.getMarketConfig(market);
        if (!marketConfig) return null;
        
        const agent = marketConfig.agents.find(a => a.folder === agentName);
        return agent ? agent.display_name : null;
    }

    getIcon(agentName, market) {
        const marketConfig = this.getMarketConfig(market);
        if (!marketConfig) return null;
        
        const agent = marketConfig.agents.find(a => a.folder === agentName);
        return agent ? agent.icon : null;
    }

    getColor(agentName, market) {
        const marketConfig = this.getMarketConfig(market);
        if (!marketConfig) return null;
        
        const agent = marketConfig.agents.find(a => a.folder === agentName);
        return agent ? agent.color : null;
    }

    getDataPath() {
        return this.config?.data?.base_path || './data';
    }

    getPriceFilePrefix() {
        return this.config?.data?.price_file_prefix || 'daily_prices_';
    }

    getBenchmarkFile() {
        return this.config?.data?.benchmark_file || 'Adaily_prices_QQQ.json';
    }

    getUIConfig() {
        return this.config?.ui || { initial_value: 10000 };
    }
}

// Export for use in other modules
window.ConfigLoader = ConfigLoader;