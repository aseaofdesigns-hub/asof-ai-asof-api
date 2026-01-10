# ASOF.ai MCP Server Setup

The ASOF.ai MCP (Model Context Protocol) server allows AI agents like Claude, ChatGPT, and others to directly validate data through your API.

## What the MCP Server Does

The server exposes three tools to AI agents:

1. **validate_asof** - Validate whether an assumption, signal, or dataset is still valid
2. **create_payment_session** - Create a Stripe checkout session to purchase validation credits
3. **check_payment_status** - Check if a payment session has been completed

## Running the MCP Server

Run the MCP server using:

```bash
npx tsx server/mcp.ts
```

The server communicates via stdio (standard input/output), which is the standard transport for local MCP servers.

## Claude Desktop Configuration

To connect Claude Desktop to your ASOF.ai MCP server, add this to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "asof-ai": {
      "command": "npx",
      "args": ["tsx", "/path/to/your/project/server/mcp.ts"],
      "env": {
        "ASOF_API_URL": "https://asofai.com"
      }
    }
  }
}
```

Replace `/path/to/your/project` with the actual path to your ASOF.ai project.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ASOF_API_URL` | `https://asofai.com` | Base URL for the ASOF.ai API |

## Example Usage in Claude

Once configured, you can ask Claude to validate data:

**User**: "Check if the S&P 500 closing price data from yesterday is still valid"

Claude will:
1. Use `create_payment_session` to get a checkout URL
2. Guide you to complete payment
3. Use `validate_asof` to check the data validity
4. Return the confidence score and verdict

## Available Tools Reference

### validate_asof

Validates an assumption or data point.

**Required Parameters:**
- `agent_id` - Your AI agent identifier
- `claim` - The assertion to validate
- `subject_id` - ID of the subject being validated
- `subject_type` - Type of subject (e.g., "market_data", "regulation")
- `session_id` - Paid Stripe session ID

**Optional Parameters:**
- `subject_label` - Human-readable label
- `max_age_seconds` - Maximum acceptable age (default: 3600)
- `context_domain` - Domain context (e.g., "finance")
- `context_jurisdiction` - Jurisdiction (e.g., "US-NY")
- `risk_tolerance` - "low", "medium", or "high"

### create_payment_session

Creates a Stripe checkout for validation credits.

**Required Parameters:**
- `tier` - "lite" ($0.50), "pro" ($1.00), or "max" ($2.50)

### check_payment_status

Checks if a payment has been completed.

**Required Parameters:**
- `session_id` - Stripe checkout session ID

## Security Notes

- The MCP server runs locally and connects to your published ASOF.ai instance
- API keys and secrets are managed by the server, not exposed to AI agents
- Payment verification prevents unauthorized validation requests
