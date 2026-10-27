import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "How family members connect to the shared PikPak storage with Tordroid Plus and WebDAV.",
};

export default function FAQPage() {
  const faqs = [
    {
      question: "What is Tordroid Plus?",
      answer:
        "Tordroid Plus is our private family portal for the shared PikPak Premium storage. Sign in to get a WebDAV login, then open the files in any WebDAV app to stream or download them.",
    },
    {
      question: "How do I join?",
      answer:
        "Ask Tordroid for the family invite code, then open the Sign Up page and enter it together with your email and a password.",
    },
    {
      question: "Where do I find my WebDAV login?",
      answer:
        "After signing in, open the WebDAV tab. Pick any client card and copy its username and password. The server address is always https://dav.mypikpak.com. Logins are refreshed automatically, so come back here for a new one if yours stops working.",
    },
    {
      question: "How do I connect on Android?",
      answer:
        "Install a WebDAV-capable file manager such as Solid Explorer, CX File Explorer or Material Files, or a player such as VLC, nPlayer or Kodi. Add a new WebDAV connection with server dav.mypikpak.com, port 443, HTTPS/SSL on, and the username and password from the WebDAV tab.",
    },
    {
      question: "How do I connect on Windows?",
      answer:
        "Use a WebDAV app such as RaiDrive or WinSCP for the best experience, or open File Explorer, choose 'Map network drive' and enter https://dav.mypikpak.com with your WebDAV username and password.",
    },
    {
      question: "How do I connect on iPhone, iPad or Mac?",
      answer:
        "On iPhone/iPad use the Files app (Connect to Server) or apps like FE File Explorer, Infuse or VLC. On a Mac, open Finder, choose Go → Connect to Server and enter https://dav.mypikpak.com.",
    },
    {
      question: "Can I delete or change files?",
      answer:
        "No. Family WebDAV logins are read-only, so you can browse, stream and download, but nothing in the shared storage can be deleted or changed by accident.",
    },
    {
      question: "Streaming suddenly stopped working. Why?",
      answer:
        "Either your WebDAV login was refreshed (grab a new one from the WebDAV tab) or the account's daily download traffic is used up. Check the Quota tab and try again later.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 bg-gradient-to-b from-background to-muted/20 overflow-x-hidden w-full">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Help &amp; FAQ
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything the family needs to get connected to Tordroid Plus
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
    </main>
  );
}
