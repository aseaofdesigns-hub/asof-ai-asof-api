import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "We'll get back to you shortly.",
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 relative z-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
          <div className="text-center space-y-4">
            <motion.h1 variants={item} className="text-4xl font-extrabold tracking-tight">Contact Us</motion.h1>
            <motion.p variants={item} className="text-muted-foreground">Need help with your automations? We're here for you.</motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div variants={item} className="space-y-8">
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-xl">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Email Support</h3>
                  <p className="text-sm text-muted-foreground">hello@asofai.com</p>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="bg-purple-500/20 p-3 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold">Community</h3>
                  <p className="text-sm text-muted-foreground">Join our Discord</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/10">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" className="glass-input" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="How can we help?" className="glass-input min-h-[120px]" required />
                </div>
                <Button type="submit" className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
