import { Metadata } from "next";
import { ChevronDown, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions - PikPak Plus",
  description:
    "Find answers to common questions about using PikPak Plus for torrent management and file sharing.",
  openGraph: {
    title: "Frequently Asked Questions - PikPak Plus",
    description:
      "Find answers to common questions about using PikPak Plus for torrent management and file sharing.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Frequently Asked Questions - PikPak Plus",
    description:
      "Find answers to common questions about using PikPak Plus for torrent management and file sharing.",
  },
};

export default function FAQPage() {
  const faqs = [
    {
      question: "What is PikPak Plus?",
      answer:
        "PikPak Plus is a web-based clone of the popular PikPak service that allows users to experience PikPak's features and services in a web environment. It's designed to provide similar functionality to the original service for educational and personal use.",
    },
    {
      question: "How does PikPak Plus work?",
      answer:
        "PikPak Plus replicates the core functionality of the original PikPak service in a web-based interface. Users can access similar features and services to experience how PikPak works.",
    },
    {
      question: "Is PikPak Plus an official service?",
      answer:
        "No, PikPak Plus is not an official service. It's an independent web-based clone designed to let users experience the functionality of PikPak's services.",
    },
    {
      question: "What is the purpose of PikPak Plus?",
      answer:
        "The purpose of PikPak Plus is to provide users with a way to experience PikPak's service features in a web-based environment. It's designed for educational purposes and to allow users to understand how the original service works.",
    },
    {
      question: "Is my data safe on PikPak Plus?",
      answer:
        "PikPak Plus is a web-based clone for educational purposes. For actual file storage and management, please use the official PikPak service. This clone is intended for experiencing the interface and functionality only.",
    },
    {
      question: "How can I get support for PikPak Plus?",
      answer:
        "PikPak Plus is an independent project for educational purposes. For support with the actual PikPak service, please contact the official PikPak support team. This clone is provided as-is for learning purposes.",
    },
    {
      question: "What are the limitations of PikPak Plus?",
      answer:
        "PikPak Plus is a web-based clone designed for educational purposes. It may not have all the features of the original service and should not be used for actual file storage or management. It's intended to demonstrate how the original service works.",
    },
    {
      question: "Where can I find the official PikPak service?",
      answer:
        "For the official PikPak service, please visit the official website or use their official applications. This clone is only intended to help users understand how the service works.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs sm:text-sm font-medium shadow-xs">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-balance bg-linear-to-b from-foreground to-foreground/80 bg-clip-text">
            Frequently Asked Questions
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Find answers to common questions about using PikPak Plus
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              open={index === 0}
              className="group border border-border/60 bg-card/70 backdrop-blur-sm rounded-xl p-5 hover:border-primary/40 transition-all duration-200 shadow-xs open:bg-card/95 open:shadow-md"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden font-semibold text-foreground text-base sm:text-lg select-none">
                <div className="flex items-center gap-3 pr-2">
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono shrink-0 ring-1 ring-primary/20">
                    Q{index + 1}
                  </span>
                  <span>{faq.question}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0" />
              </summary>
              <div className="pt-3.5 mt-3.5 border-t border-border/40 text-sm sm:text-base text-muted-foreground leading-relaxed pl-10">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
