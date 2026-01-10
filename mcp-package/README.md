# ASOF.ai MCP Server

Connect AI agents like Claude and ChatGPT to the [ASOF.ai](https://asofai.com) validation service using the Model Context Protocol (MCP).

## What is ASOF.ai?

ASOF.ai validates whether assumptions, signals, or datasets are still valid as of the current moment. It provides confidence-scored verdicts that AI agents can safely act on.

## Installation

```bash
npm install -g asof-ai-mcp
```

Or run directly with npx:

```bash
npx asof-ai-mcp
```

## Configure Claude Desktop

Add this to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "asof-ai": {
      "command": "npx",
      "args": ["asof-ai-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Available Tools

### create_payment_session

Create a Stripe checkout session to purchase validation credits.

**Pricing:**
- `lite` - $0.50: Basic verdict with confidence score
- `pro` - $1.00: Adds evidence and explanation
- `max` - $2.50: Full analysis with conflict detection

### check_payment_status

Check if a payment session has been completed.

### validate_asof

Validate data after payment is complete.

**Parameters:**
- `agent_id` (required): Your AI agent identifier
- `payload` (required): JSON object with data to validate
- `session_id` (required): Paid Stripe session ID

## Example Usage

Once connected, ask Claude:

> "I need to validate if my market data from yesterday is still current"

Claude will:
1. Create a payment session for you
2. Guide you to complete the Stripe checkout
3. Run the validation with your paid session
4. Return confidence score and verdict

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ASOF_API_URL` | `https://asofai.com` | Base URL for the API |

## Support

Contact: Support@asofai.com

## License

MIT
