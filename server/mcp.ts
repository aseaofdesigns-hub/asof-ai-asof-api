import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "asof-ai-validation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "validate_asof",
        description: `Validate whether an assumption, signal, or dataset is still valid as of the current moment. 
Returns a confidence-scored verdict that AI agents can safely act on.

IMPORTANT: This is a paid service. You must first create a payment session using create_payment_session, 
complete the Stripe checkout, then use the session_id to run validation.

Tiers:
- lite ($0.50): Basic verdict with confidence score
- pro ($1.00): Adds evidence array and explanation
- max ($2.50): Full analysis with conflict detection`,
        inputSchema: {
          type: "object",
          properties: {
            agent_id: {
              type: "string",
              description: "Unique identifier for your AI agent",
            },
            claim: {
              type: "string",
              description: "The assertion you want to validate (e.g., 'This market data is still current')",
            },
            subject_id: {
              type: "string",
              description: "ID of the subject being validated",
            },
            subject_type: {
              type: "string",
              description: "Type of subject (e.g., 'market_data', 'regulation', 'dataset')",
            },
            subject_label: {
              type: "string",
              description: "Human-readable label for the subject",
            },
            max_age_seconds: {
              type: "number",
              description: "Maximum acceptable age in seconds before data is considered stale",
            },
            session_id: {
              type: "string",
              description: "Stripe checkout session ID (must be paid)",
            },
            context_domain: {
              type: "string",
              description: "Optional: Domain context (e.g., 'finance', 'compliance')",
            },
            context_jurisdiction: {
              type: "string",
              description: "Optional: Jurisdiction (e.g., 'US-NY', 'EU')",
            },
            risk_tolerance: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Optional: Risk tolerance level",
            },
          },
          required: ["agent_id", "claim", "subject_id", "subject_type", "session_id"],
        },
      },
      {
        name: "create_payment_session",
        description: `Create a Stripe checkout session to purchase ASOF.ai validation credits.
Returns a checkout URL that the user must visit to complete payment.
After payment, you'll receive a session_id to use with validate_asof.

Pricing:
- lite: $0.50 - Basic verdict and confidence score
- pro: $1.00 - Adds evidence and explanation  
- max: $2.50 - Full analysis with conflict detection and priority processing`,
        inputSchema: {
          type: "object",
          properties: {
            tier: {
              type: "string",
              enum: ["lite", "pro", "max"],
              description: "Pricing tier to purchase",
            },
          },
          required: ["tier"],
        },
      },
      {
        name: "check_payment_status",
        description: "Check the payment status of a Stripe checkout session",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Stripe checkout session ID",
            },
          },
          required: ["session_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const baseUrl = process.env.ASOF_API_URL || "https://asofai.com";

  try {
    if (name === "create_payment_session") {
      const response = await fetch(`${baseUrl}/api/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: args?.tier }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Error creating payment session: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Payment session created successfully.

Checkout URL: ${data.url}

Please direct the user to complete payment at this URL. After payment, they will be redirected with a session_id parameter that you can use with the validate_asof tool.`,
          },
        ],
      };
    }

    if (name === "check_payment_status") {
      const response = await fetch(
        `${baseUrl}/api/verify-payment/${args?.session_id}`
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: "Session not found or invalid session ID.",
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Payment status: ${data.status}${data.status === "paid" ? "\n\nYou can now use this session_id with the validate_asof tool." : ""}`,
          },
        ],
      };
    }

    if (name === "validate_asof") {
      const payload = {
        agent_id: args?.agent_id,
        payload: {
          asof: {
            claim: args?.claim,
            subject: {
              id: args?.subject_id,
              type: args?.subject_type,
              label: args?.subject_label || args?.subject_id,
            },
            freshness: {
              max_age_seconds: args?.max_age_seconds || 3600,
              last_verified_at: new Date().toISOString(),
            },
            ...(args?.context_domain && {
              context: {
                domain: args?.context_domain,
                jurisdiction: args?.context_jurisdiction,
                risk_tolerance: args?.risk_tolerance,
              },
            }),
          },
        },
        sessionId: args?.session_id,
      };

      const response = await fetch(`${baseUrl}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Validation failed: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }

      const result = await response.json();
      const data = result.data;

      let responseText = `ASOF Validation Result
━━━━━━━━━━━━━━━━━━━━━━
Insight: ${data.insight}
Confidence: ${(data.confidence * 100).toFixed(1)}%
Timestamp: ${data.timestamp}`;

      if (data.explanation) {
        responseText += `\n\nExplanation: ${data.explanation}`;
      }

      if (data.evidence && data.evidence.length > 0) {
        responseText += `\n\nEvidence:`;
        for (const e of data.evidence) {
          responseText += `\n  - ${e.name}: ${e.value} (weight: ${e.weight})`;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ASOF.ai MCP Server running on stdio");
}

main().catch(console.error);
