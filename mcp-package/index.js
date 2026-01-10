#!/usr/bin/env node
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
            payload: {
              type: "object",
              description: "JSON object containing the data to validate (any structure)",
              additionalProperties: true,
            },
            session_id: {
              type: "string",
              description: "Stripe checkout session ID (must be paid)",
            },
          },
          required: ["agent_id", "payload", "session_id"],
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
              text: JSON.stringify({
                success: false,
                error: error.message || "Unknown error",
              }),
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              checkout_url: data.url,
              instructions: "Direct user to checkout_url to complete payment. After payment, extract session_id from the redirect URL query parameter.",
            }),
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
              text: JSON.stringify({
                success: false,
                error: "Session not found or invalid session ID",
              }),
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              status: data.status,
              can_validate: data.status === "paid",
            }),
          },
        ],
      };
    }

    if (name === "validate_asof") {
      const requestBody = {
        agent_id: String(args?.agent_id || ""),
        payload: args?.payload || {},
        sessionId: String(args?.session_id || ""),
      };

      const response = await fetch(`${baseUrl}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error.message || "Unknown error",
                field: error.field,
              }),
            },
          ],
        };
      }

      const result = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          }),
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
