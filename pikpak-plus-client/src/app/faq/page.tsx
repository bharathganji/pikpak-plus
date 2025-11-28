import { Metadata } from "next";

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground">
          Find answers to common questions about using PikPak Plus
        </p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question} className="border-b border-border pb-6">
            <h2 className="text-xl font-semibold mb-3 text-foreground">
              {faq.question}
            </h2>
            <p className="text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
