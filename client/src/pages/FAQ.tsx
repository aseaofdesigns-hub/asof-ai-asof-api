import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Lightbulb, HelpCircle, Check, X, Copy, CheckCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const [copied, setCopied] = useState(false);
  
  const copyEmail = () => {
    navigator.clipboard.writeText("Support@asofai.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const billingFaqs = [
    {
      question: "Do I get charged automatically?",
      answer: "No. You are never charged automatically.",
      icon: <X className="w-4 h-4 text-red-400" />
    },
    {
      question: "When do I pay?",
      answer: "You pay only when you approve a validation and complete checkout.",
      icon: <Check className="w-4 h-4 text-emerald-400" />
    },
    {
      question: "Is there a subscription?",
      answer: "No. ASOF.ai is pay-per-validation only.",
      icon: <X className="w-4 h-4 text-red-400" />
    },
    {
      question: "Can I try ASOF.ai before paying?",
      answer: "Yes. You get one free Lite-tier validation per device — no payment required. After that, each run requires a paid session.",
      icon: <Check className="w-4 h-4 text-emerald-400" />
    },
    {
      question: "Can I cancel?",
      answer: "Yes. Just don't complete checkout — nothing runs, nothing charges.",
      icon: <Check className="w-4 h-4 text-emerald-400" />
    },
    {
      question: "What does each tier include?",
      answer: "Every tier gives you a risk verdict and the full assumption list. Lite ($0.50) adds what could break. Pro ($1.00) adds the verify checklist and suggestion cards. Max ($2.50) adds a safer code rewrite side-by-side with your original.",
      icon: <Check className="w-4 h-4 text-emerald-400" />
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 relative z-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
          <div className="text-center space-y-4">
            <motion.div variants={item} className="flex justify-center">
              <HelpCircle className="w-12 h-12 text-primary" />
            </motion.div>
            <motion.h1 variants={item} className="text-4xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </motion.h1>
            <motion.p variants={item} className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about ASOF.ai billing and how validations work.
            </motion.p>
          </div>

          <motion.div variants={item}>
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  Billing & Usage
                  <span className="text-sm font-normal text-muted-foreground ml-2">(No Subscriptions)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    No automatic charges — you control every validation
                  </p>
                </div>
                
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {billingFaqs.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`billing-${index}`}
                      className="border border-white/5 rounded-xl px-4 data-[state=open]:bg-white/5"
                      data-testid={`accordion-billing-${index}`}
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <span className="flex items-center gap-3 text-left">
                          {faq.icon}
                          {faq.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-amber-500/20 p-2 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                  </div>
                  Why Validation Costs Money
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  ASOF.ai performs real-time, conflict-aware analysis to verify whether something is still true <strong className="text-foreground">as of now</strong>. Each validation runs live scoring, evidence weighting, and risk detection so you can act with confidence — not guesses.
                </p>
                
                <div className="grid sm:grid-cols-3 gap-4 pt-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-2xl font-bold text-primary">Live</div>
                    <div className="text-xs text-muted-foreground">Scoring</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-2xl font-bold text-blue-400">Evidence</div>
                    <div className="text-xs text-muted-foreground">Weighting</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-2xl font-bold text-purple-400">Risk</div>
                    <div className="text-xs text-muted-foreground">Detection</div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-center">
                    <strong className="text-primary">No subscriptions. No automatic charges.</strong>
                    <br />
                    <span className="text-muted-foreground">You only pay when you approve a validation.</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              Still have questions? Contact us at:
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-primary font-medium">Support@asofai.com</span>
              <button
                onClick={copyEmail}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                data-testid="button-copy-email-faq"
                title="Copy email address"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-400 mt-1">Email copied!</p>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
