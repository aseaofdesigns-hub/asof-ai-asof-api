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
- `agent_id` - Your AI agent identifier (string)
- `payload` - JSON object containing the data to validate (any structure)
- `session_id` - Paid Stripe session ID (string)

**Example payload:**
```json
{
  "agent_id": "my-agent-001",
  "payload": {
    "claim": "S&P 500 closing price is still current",
    "subject": {
      "id": "sp500-close",
      "type": "market_data"
    }
  },
  "session_id": "cs_live_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insight": "As-of signal processed (PRO Tier)",
    "confidence": 0.92,
    "evidence": [...],
    "explanation": "Signal verified against primary and secondary sources.",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

### create_payment_session

Creates a Stripe checkout for validation credits.

**Required Parameters:**
- `tier` - "lite" ($0.50), "pro" ($1.00), or "max" ($2.50)

**Response:**
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/...",
  "instructions": "Direct user to checkout_url to complete payment."
}
```

### check_payment_status

Checks if a payment has been completed.

**Required Parameters:**
- `session_id` - Stripe checkout session ID

**Response:**
```json
{
  "success": true,
  "status": "paid",
  "can_validate": true
}
```

## Security Notes

- The MCP server runs locally and connects to your published ASOF.ai instance
- API keys and secrets are managed by the server, not exposed to AI agents
- Payment verification prevents unauthorized validation requests
- All tool responses return structured JSON for reliable parsing
