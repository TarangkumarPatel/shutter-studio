import ContactForm from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact | Shutter Studio",
  description: "Get in touch — send a message about a project, a print, or a collaboration.",
};

export default function ContactPage() {
  return (
    <section className="relative px-6 pt-40 pb-24 md:pt-52 md:pb-32">
      <div className="grain-overlay" />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(227,169,74,0.08), transparent 70%)",
        }}
      />

      <div className="max-w-xl mx-auto text-center mb-14">
        <p className="text-xs md:text-sm tracking-[0.4em] uppercase text-(--color-accent) mb-6">
          Get in Touch
        </p>
        <h1 className="font-display italic text-5xl sm:text-6xl md:text-7xl leading-[1.05] text-(--color-fg) text-balance">
          Let&rsquo;s connect.
        </h1>
        <p className="mt-7 text-(--color-fg-muted) text-base md:text-lg leading-relaxed text-balance">
          Whether it&rsquo;s a shoot, a print, or just to talk photography —
          send a note and I&rsquo;ll get back to you.
        </p>
      </div>

      <ContactForm />
    </section>
  );
}
