export function HowItWorks() {
  const steps = [
    { num: "01", title: "Describe", desc: "Type a single sentence about what your AI agent does.", accent: "from-primary/20 to-primary/5" },
    { num: "02", title: "Review", desc: "Approve the generated brand, pricing, and 2-part description.", accent: "from-primary/30 to-primary/10" },
    { num: "03", title: "Deploy", desc: "Watch the SSE stream execute the OKX CLI commands in real-time.", accent: "from-primary/40 to-primary/20" }
  ]

  return (
    <section id="how-it-works" className="py-28 border-t border-border/60 bg-card/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
          <p className="text-muted-foreground/80 text-lg max-w-xl mx-auto">
            Three simple steps to deploy your agent.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-border/40 via-border to-border/40" />

          {steps.map((step, i) => (
            <div key={i} className="relative p-6 text-center md:text-left">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.accent} border border-border/60 flex items-center justify-center mb-6 mx-auto md:mx-0`}>
                <span className="text-xl font-bold text-primary">{step.num}</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground/80 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
