# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Trader is a Python-based autonomous trading platform where multiple AI models compete in stock trading without human intervention. It supports both US (NASDAQ 100) and Chinese A-share (SSE 50) markets using LangChain with MCP (Model Context Protocol) toolchain.

## Essential Commands

### Quick Start (Complete Workflow)
```bash
# One-click complete trading environment launch
bash scripts/main.sh
```

### Step-by-Step Development
```bash
# Step 1: Prepare data (US market)
bash scripts/main_step1.sh

# Step 2: Start MCP services
bash scripts/main_step2.sh

# Step 3: Run trading agents
bash scripts/main_step3.sh

# Start web UI dashboard
bash scripts/start_ui.sh
```

### A-Share Market (Chinese Stocks)
```bash
# Step 1: Prepare A-share data
bash scripts/main_a_stock_step1.sh

# Step 2: Start MCP services
bash scripts/main_a_stock_step2.sh

# Step 3: Run A-share trading agents
bash scripts/main_a_stock_step3.sh
```

### Data Management
```bash
# Update daily price data (US)
cd data && python get_daily_price.py && python merge_jsonl.py

# Update A-share price data
cd data/A_stock && python get_daily_price_a_stock.py && python merge_a_stock_jsonl.py

# Update hourly price data (US)
cd data && python get_interdaily_price.py && python merge_jsonl.py
```

### MCP Services Management
```bash
# Start all MCP services manually
cd agent_tools && python start_mcp_services.py

# Services run on ports 8000-8003:
# 8000: Math tools
# 8001: Search tools
# 8002: Trade tools
# 8003: Price tools
```

## Architecture Overview

### Core Components

**Agent System (`/agent/`)**
- `base_agent/base_agent.py`: US market trading agents with LangChain + MCP integration
- `base_agent/base_agent_hour.py`: Hourly trading agents for US market
- `base_agent_astock/base_agent_astock.py`: Chinese A-share specialized agents
- Dynamic agent registry in `main.py` supports multiple agent types

**MCP Toolchain (`/agent_tools/`)**
- `tool_trade.py`: Stock trading execution (auto-adapts to market rules)
- `tool_get_price_local.py`: Price queries for US and A-shares
- `tool_jina_search.py`: Market information search
- `tool_math.py`: Financial calculations
- `start_mcp_services.py`: Service orchestration on ports 8000-8003

**Configuration System (`/configs/`)**
- `default_config.json`: US market settings (initial cash: $10,000)
- `astock_config.json`: A-share settings (initial cash: ¥100,000)
- Model enablement flags and API configurations
- Date ranges for backtesting with anti-look-ahead controls

**Data Architecture (`/data/`)**
- Complete OHLCV data for NASDAQ 100 and SSE 50 stocks
- Agent performance logs in `agent_data/{model_name}/`
- Position tracking and trade history in JSONL format
- Separate A-stock data directory for Chinese market

### Key Design Patterns

**Tool-Driven Execution**: All trading operations go through MCP tools - agents never directly manipulate data

**Multi-Agent Competition**: Each AI model runs independently with separate cash pools and position tracking

**Historical Replay**: Time-period simulation with automatic future information filtering to prevent look-ahead bias

**Market Adaptation**: Trading tools automatically detect market type (US vs China) and apply appropriate rules

## Development Guidelines

### Adding New AI Models
1. Add model configuration to `configs/default_config.json` or `astock_config.json`
2. Set `enabled: true` to activate the model
3. Ensure API keys are configured in `.env` file
4. Model will automatically appear in leaderboard and performance tracking

### Creating Custom Trading Strategies
1. Inherit from `BaseAgent` (US market) or `BaseAgentAStock` (China market)
2. Override the `run()` method with your strategy logic
3. Register in `AGENT_REGISTRY` in `main.py`
4. Update configuration to use your agent type

### Environment Variables (`.env`)
```bash
OPENAI_API_BASE=          # OpenAI-compatible API endpoint
OPENAI_API_KEY=           # API key for AI models
ALPHAADVANTAGE_API_KEY=   # US stock data provider
JINA_API_KEY=             # Market information search
TUSHARE_TOKEN=            # Chinese market data provider
```

### Common Issues and Solutions

**MCP Services Not Starting**: Check ports 8000-8003 are available, no conflicts with other services

**Data Not Loading**: Verify API keys in `.env` file, check network connectivity to data providers

**Agent Not Trading**: Ensure model is enabled in config, check MCP service connectivity, verify date ranges

**Performance Issues**: Reduce `max_steps` in config for faster execution, use hourly data for more granular testing

## Testing and Validation

No formal test suite exists - validation is done through:
- Live trading competitions with real market data
- Performance comparison against market benchmarks (QQQ for US, SSE-50 for China)
- Manual verification of trade execution and position tracking
- Web dashboard monitoring at `http://localhost:8888`

## Important Notes

- This is a research platform for studying AI performance in financial markets
- All trading is simulated with historical data - no real money is involved
- The system prevents look-ahead bias through careful date management
- Each agent operates independently with separate cash pools
- Performance data is publicly available at https://ai4trade.ai