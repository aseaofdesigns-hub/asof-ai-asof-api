import { useState } from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Code2, 
  Zap, 
  Shield, 
  DollarSign,
  ExternalLink,
  Terminal,
  Play,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

export default function ApiDocs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [testScenario, setTestScenario] = useState<"conflicted" | "invalid">("conflicted");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("Support@asofai.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const runTest = async () => {
    if (!sessionId.trim()) {
      setTestResult(JSON.stringify({ error: "Please enter a session ID" }, null, 2));
      return;
    }
    setIsRunning(true);
    setTestResult(null);

    const conflictedPayload = {
      agent_id: "test-agent",
      sessionId: sessionId.trim(),
      payload: {
        type: "policy_claim",
        claim: "Amazon delivers in 1-3 days",
        asof_check: {
          signals: [
            {
              source: "amazon_policy",
              priority: 1,
              assertion: "Standard shipping 1-3 business days",
              confidence: 0.95,
              last_verified_at: new Date().toISOString()
            },
            {
              source: "customer_reviews",
              priority: 2,
              assertion: "Delivery varies and exceeds 4-6 days during peak",
              confidence: 0.85,
              last_verified_at: new Date().toISOString()
            }
          ]
        }
      }
    };

    const invalidPayload = {
      agent_id: "ml-monitor",
      sessionId: sessionId.trim(),
      payload: {
        type: "dataset_validity",
        dataset_name: "fraud_model",
        asof_check: {
          signals: [
            {
              source: "model_monitor",
              priority: 1,
              assertion: "AUC dropped from 0.92 to 0.78 (drop of 0.14)",
              confidence: 0.99,
              last_verified_at: new Date().toISOString()
            }
          ]
        }
      }
    };

    try {
      const payload = testScenario === "conflicted" ? conflictedPayload : invalidPayload;
      const response = await apiRequest("POST", "/api/run", payload);
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6 opacity-50 hover:opacity-100"
      onClick={() => copyToClipboard(text, section)}
      data-testid={`button-copy-${section}`}
    >
      {copiedSection === section ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  const createPaymentExample = `# Replace YOUR_BASE_URL with your deployment URL (e.g., https://asofai.com)
curl -X POST YOUR_BASE_URL/api/create-payment \\
  -H "Content-Type: application/json" \\
  -d '{"tier": "pro"}'`;

  const runAutomationExample = `# Replace YOUR_BASE_URL with your deployment URL
curl -X POST YOUR_BASE_URL/api/run \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "your-agent-id",
    "payload": {
      "asof": {
        "claim": "This data is still valid",
        "subject": {
          "id": "data-123",
          "type": "dataset",
          "label": "Market prices Q1"
        },
        "freshness": {
          "stale_after": "2026-01-15T00:00:00Z",
          "max_age_seconds": 86400,
          "last_verified_at": "2026-01-10T12:00:00Z"
        }
      }
    },
    "sessionId": "cs_live_xxx"
  }'`;

  const pythonExample = `import requests

# Set your deployment URL (e.g., https://asofai.com)
BASE_URL = "https://asofai.com"

# Step 1: Create a payment session
response = requests.post(
    f"{BASE_URL}/api/create-payment",
    json={"tier": "pro"}
)
checkout_url = response.json()["url"]
# Redirect user to checkout_url

# Step 2: After payment, run validation
session_id = "cs_live_xxx"  # From Stripe redirect

result = requests.post(
    f"{BASE_URL}/api/run",
    json={
        "agent_id": "my-trading-bot",
        "payload": {
            "asof": {
                "claim": "AAPL price data is current",
                "subject": {"id": "aapl-price", "type": "market_data"},
                "freshness": {"max_age_seconds": 300}
            }
        },
        "sessionId": session_id
    }
)

print(result.json())
# {
#   "success": true,
#   "data": {
#     "insight": "As-of signal processed (PRO Tier)",
#     "confidence": 0.92,
#     "evidence": [...],
#     "explanation": "Signal verified...",
#     "timestamp": "2026-01-10T12:00:00Z"
#   }
# }`;

  const jsExample = `// Using fetch in Node.js or browser

// Set your deployment URL (e.g., https://asofai.com)
const BASE_URL = "https://asofai.com";

// Step 1: Create payment
const paymentRes = await fetch(\`\${BASE_URL}/api/create-payment\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tier: "max" })
});
const { url } = await paymentRes.json();
// Redirect: window.location.href = url;

// Step 2: After payment, validate data
const result = await fetch(\`\${BASE_URL}/api/run\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agent_id: "compliance-checker-01",
    payload: {
      asof: {
        claim: "Regulatory requirement is still valid",
        subject: { id: "reg-123", type: "compliance_rule" },
        context: { jurisdiction: "US-NY", risk_tolerance: "low" }
      }
    },
    sessionId: "cs_live_xxx"
  })
});

const data = await result.json();
console.log(data.data.confidence); // 0.98 for MAX tier`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Code2 className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">API Documentation</h1>
            </div>
            <p className="text-muted-foreground">
              Integrate ASOF.ai validation into your AI agents and automated systems
            </p>
          </motion.div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-primary" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ASOF.ai provides a simple REST API for validating whether data, assumptions, or signals are still current. 
                The flow is: <strong>Pay</strong> → <strong>Validate</strong> → <strong>Get Verdict</strong>.
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center" data-testid="card-tier-lite">
                  <div className="text-lg font-bold text-emerald-400" data-testid="text-price-lite">$0.50</div>
                  <div className="text-xs text-muted-foreground">Lite - Basic verdict</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center" data-testid="card-tier-pro">
                  <div className="text-lg font-bold text-blue-400" data-testid="text-price-pro">$1.00</div>
                  <div className="text-xs text-muted-foreground">Pro - With evidence</div>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center" data-testid="card-tier-max">
                  <div className="text-lg font-bold text-purple-400" data-testid="text-price-max">$2.50</div>
                  <div className="text-xs text-muted-foreground">Max - Full analysis</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="w-5 h-5 text-primary" />
                Supported Languages & Frameworks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ASOF.ai is a REST API that accepts JSON. It works with any language or framework that can make HTTP requests.
              </p>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Programming Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {["Python", "JavaScript", "TypeScript", "Go", "Rust", "Java", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "Elixir", "C++"].map((lang) => (
                    <Badge key={lang} variant="outline" className="bg-white/5" data-testid={`badge-lang-${lang.toLowerCase()}`}>{lang}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">AI Agent Frameworks</h4>
                <div className="flex flex-wrap gap-2">
                  {["LangChain", "LlamaIndex", "AutoGPT", "CrewAI", "AutoGen", "Semantic Kernel", "Haystack", "Flowise"].map((fw) => (
                    <Badge key={fw} variant="outline" className="bg-primary/10 text-primary border-primary/20" data-testid={`badge-framework-${fw.toLowerCase().replace(/\s/g, '-')}`}>{fw}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">LLM Providers (Tool/Function Calling)</h4>
                <div className="flex flex-wrap gap-2">
                  {["OpenAI", "Anthropic Claude", "Google Gemini", "Mistral", "Cohere", "AWS Bedrock", "Azure OpenAI", "Groq", "Together AI"].map((provider) => (
                    <Badge key={provider} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20" data-testid={`badge-provider-${provider.toLowerCase().replace(/\s/g, '-')}`}>{provider}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Integration Protocols</h4>
                <div className="flex flex-wrap gap-2">
                  {["REST API", "MCP (Model Context Protocol)", "OpenAPI 3.1", "Webhooks", "cURL", "HTTP/HTTPS"].map((protocol) => (
                    <Badge key={protocol} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-protocol-${protocol.toLowerCase().replace(/[\s\/()]/g, '-')}`}>{protocol}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">POST</Badge>
                  <span>/api/create-payment</span>
                </div>
                <CopyButton text={createPaymentExample} section="create-payment" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a Stripe checkout session to purchase validation credits.
              </p>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Request Body</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono">
{`{
  "tier": "lite" | "pro" | "max"
}`}
                </pre>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Response</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono">
{`{
  "url": "https://checkout.stripe.com/c/pay/..."
}`}
                </pre>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">cURL Example</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono text-emerald-400">
                  {createPaymentExample}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">POST</Badge>
                  <span>/api/run</span>
                </div>
                <CopyButton text={runAutomationExample} section="run" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Submit a validation request. Requires a paid session ID from Stripe checkout.
              </p>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Request Body</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono">
{`{
  "agent_id": "string",       // Your agent identifier
  "payload": {                // Data to validate
    "asof": {
      "claim": "string",      // What you're validating
      "subject": {
        "id": "string",
        "type": "string",
        "label": "string"
      },
      "freshness": {
        "stale_after": "ISO8601",
        "max_age_seconds": number,
        "last_verified_at": "ISO8601"
      },
      "context": {            // Optional
        "domain": "string",
        "jurisdiction": "string",
        "risk_tolerance": "low" | "medium" | "high"
      },
      "signals": [...]        // Optional signal array
    }
  },
  "sessionId": "cs_live_xxx"  // Stripe session ID
}`}
                </pre>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Response</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono">
{`{
  "success": true,
  "data": {
    "insight": "As-of signal processed (PRO Tier)",
    "confidence": 0.92,
    "evidence": [             // Pro/Max only
      { "name": "source_timestamp", "value": "...", "weight": 0.7 }
    ],
    "explanation": "...",     // Pro/Max only
    "timestamp": "2026-01-10T12:00:00Z"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">GET</Badge>
                  <span>/api/verify-payment/:sessionId</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verify payment status before running automation.
              </p>
              
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Response</h4>
                <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono">
{`{
  "status": "paid" | "unpaid" | "pending"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  Python Example
                </div>
                <CopyButton text={pythonExample} section="python" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono text-blue-300">
                {pythonExample}
              </pre>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  JavaScript Example
                </div>
                <CopyButton text={jsExample} section="js" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono text-yellow-300">
                {jsExample}
              </pre>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Tier Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm" data-testid="table-tier-comparison">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-muted-foreground">Feature</th>
                    <th className="text-center py-2 text-emerald-400" data-testid="text-header-lite">Lite ($0.50)</th>
                    <th className="text-center py-2 text-blue-400" data-testid="text-header-pro">Pro ($1.00)</th>
                    <th className="text-center py-2 text-purple-400" data-testid="text-header-max">Max ($2.50)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-2">Verdict & Confidence Score</td>
                    <td className="text-center">Yes</td>
                    <td className="text-center">Yes</td>
                    <td className="text-center">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2">Evidence Array</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center">Yes</td>
                    <td className="text-center">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2">Explanation Text</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center">Yes</td>
                    <td className="text-center">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2">Conflict Detection</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2">Priority Processing</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center text-muted-foreground">No</td>
                    <td className="text-center">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2">Confidence Level</td>
                    <td className="text-center">~87%</td>
                    <td className="text-center">~92%</td>
                    <td className="text-center">~98%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="w-5 h-5 text-primary" />
                Test API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test the API directly. First create a payment, then enter your session ID below.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Session ID (from Stripe)</label>
                  <Input
                    placeholder="cs_live_xxx or cs_test_xxx"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="bg-black/40 border-white/10"
                    data-testid="input-session-id"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Test Scenario</label>
                  <div className="flex gap-2">
                    <Button
                      variant={testScenario === "conflicted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestScenario("conflicted")}
                      data-testid="button-scenario-conflicted"
                    >
                      CONFLICTED (Policy Claim)
                    </Button>
                    <Button
                      variant={testScenario === "invalid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestScenario("invalid")}
                      data-testid="button-scenario-invalid"
                    >
                      INVALID (Dataset)
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={runTest} 
                  disabled={isRunning}
                  className="w-full gap-2"
                  data-testid="button-run-test"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>
              
              {testResult && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Result</h4>
                  <pre className="bg-black/40 rounded-lg p-4 text-xs overflow-x-auto font-mono text-emerald-400 max-h-96 overflow-y-auto" data-testid="text-test-result">
                    {testResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                OpenAPI Specification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Machine-readable API specification for automated integration:
              </p>
              <a 
                href="/openapi.json" 
                target="_blank"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                data-testid="link-openapi"
              >
                <ExternalLink className="w-4 h-4" />
                Download OpenAPI Spec (JSON)
              </a>
            </CardContent>
          </Card>

          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              Questions? Contact us at:
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-primary font-medium">Support@asofai.com</span>
              <button
                onClick={copyEmail}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                data-testid="button-copy-email-docs"
                title="Copy email address"
              >
                {emailCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {emailCopied && (
              <p className="text-xs text-emerald-400 mt-1">Email copied!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
