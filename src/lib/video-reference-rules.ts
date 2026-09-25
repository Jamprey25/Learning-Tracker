export type TopicRule = {
  test: RegExp;
  concepts: string[];
  claim: string;
  mechanism: string;
  remember: string[];
  caveats: string[];
  useWhen: string;
  questions: string[];
  takeaways: string[];
};

/**
 * First match wins for the written summary. Keep specific titles above
 * broad topic buckets so "What does Palantir actually do?" does not fall
 * through to a generic Business lens.
 */
export const TOPIC_RULES: TopicRule[] = [
  {
    test: /\bpalantir\b/i,
    concepts: ["System Design", "AI Agents"],
    claim:
      "Palantir sells ontology-driven data fusion: operators query, write, and act on a shared object model sitting on messy source systems — not a chatbot.",
    mechanism:
      "Gotham/Foundry map tables and events into objects, links, and actions. The product is a decision loop (see → decide → write back), which is why governments and factories buy it.",
    remember: [
      "Name the customer, the object model, and who owns write-back before arguing about 'AI'.",
      "A platform that fuses data is not an autonomous agent.",
      "Switching cost lives in the ontology, not the demo.",
    ],
    caveats: [
      "Marketing will collapse 'software on your data' into 'the AI that runs the war'.",
    ],
    useWhen: "a vendor pitch treats a data platform as if it were an agent.",
    questions: [
      "What object is being standardized, and who can write it back?",
      "Which decision changes if the ontology is wrong?",
      "What would a customer have to rebuild if they left?",
    ],
    takeaways: [
      "Draw the see → decide → write-back loop before judging the product.",
      "Separate ontology lock-in from model quality.",
    ],
  },
  {
    test: /\btransformer|attention|mla\b/i,
    concepts: ["Large Language Models"],
    claim:
      "A transformer is a stack of attention + MLP blocks that mix token representations. The durable object is the residual stream, not the product name.",
    mechanism:
      "Each layer does: QKV projections → attention (who talks to whom) → residual add → MLP → residual add. Context length, KV cache, and batching dominate cost once the math is fixed.",
    remember: [
      "Attention is a weighted average of values, with weights from query–key similarity.",
      "Residual connections are why deep stacks train; they are the 'memory' of earlier layers.",
      "KV cache turns generation from O(n²) recompute into incremental decode — until memory blows up.",
    ],
    caveats: [
      "Layer-by-layer diagrams hide the economics: tokens, context, and evals decide what ships.",
    ],
    useWhen: "someone says 'the model' without naming attention, residual stream, or KV cache.",
    questions: [
      "What is in the residual stream after one attention block?",
      "Which cost dominates: matmuls, memory bandwidth, or the KV cache?",
      "What would you delete from the stack and still have a working LM?",
    ],
    takeaways: [
      "Name the layer (embed, attention, MLP, unembed) before arguing about 'AI'.",
      "Write one eval that would change your mind about a claimed improvement.",
    ],
  },
  {
    test: /\bgrover\b/i,
    concepts: ["Quantum Computing"],
    claim:
      "Grover's algorithm is quantum search: find a marked item among N candidates in about √N oracle queries — quadratic, not exponential.",
    mechanism:
      "Two reflections (oracle + diffuser) rotate the state in the 2D plane spanned by the marked state and the uniform superposition. Amplitude piles onto the answer; overshooting past ~π/4 √N hurts success probability.",
    remember: [
      "State the problem as: given a phase-flip oracle, recover the marked index.",
      "Optimal iteration count is ~π/4 √N; more is not better.",
      "This halves brute-force key bits. It does not 'break AES' by itself.",
    ],
    caveats: [
      "Confusing Grover with Shor, or treating quadratic speedup as magic.",
    ],
    useWhen: "a talk treats 'quantum search' as an exponential cheat code.",
    questions: [
      "What two reflections are being composed, and in which plane?",
      "What happens if you iterate past the optimal count?",
      "How would you explain this with Dirac notation to your past self?",
    ],
    takeaways: [
      "Separate the linear-algebra model from the hardware story.",
      "Write the query complexity before watching another explainer.",
    ],
  },
  {
    test: /\bpython actually works|cpython|mental model nobody teaches\b/i,
    concepts: ["Programming"],
    claim:
      "Python's useful mental model is names bound to objects, not 'variables that hold values' the way C does.",
    mechanism:
      "CPython compiles to bytecode, then a stack VM runs it. Assignment rebinds a name. Mutability, identity (`is`), and the GIL are consequences of that object model — not side trivia.",
    remember: [
      "A name is a reference; an object has type, identity, and (maybe) mutable state.",
      "Default arguments and late-binding closures are the same class of bug: one object, many names.",
      "The GIL serializes bytecode in one process; it is not a memory-safety story.",
    ],
    caveats: [
      "Tutorials that start from syntax hide the object/name distinction you actually debug.",
    ],
    useWhen: "a bug looks like 'Python is random' and is actually aliasing or mutability.",
    questions: [
      "After `b = a`, what is shared — the name or the object?",
      "Where would you look first: bytecode, object identity, or the GIL?",
      "How would you implement a tiny version of this model in 20 lines?",
    ],
    takeaways: [
      "Draw names → objects before adding another library.",
      "Prefer `is`/`id` language when debugging alias bugs.",
    ],
  },
  {
    test: /\benvironment variables?\b/i,
    concepts: ["System Design", "Programming"],
    claim:
      "Environment variables are process-level configuration injected by the parent (shell, Docker, Vercel) — not secrets that 'live in the app'.",
    mechanism:
      "`getenv` reads a string map inherited at process start. 12-factor uses this so the same image can run in many environments. Rotation and leakage are ops problems, not syntax problems.",
    remember: [
      "A child process inherits the env snapshot; changing `.env` on disk does not update a running process.",
      "Never commit secrets; the file is a local convenience, the source of truth is the host/runtime.",
      "`process.env.X` is always a string or undefined — parse numbers/bools yourself.",
    ],
    caveats: [
      "Treating `.env` as a database, or assuming the Next server and the browser share the same env.",
    ],
    useWhen: "config works locally and vanishes (or leaks) in deploy.",
    questions: [
      "Who injected this value, and when was the process started?",
      "Is this secret allowed in the client bundle?",
      "What happens on rotation without a restart?",
    ],
    takeaways: [
      "Name the process boundary before debugging a missing variable.",
      "Keep secrets out of `NEXT_PUBLIC_*`.",
    ],
  },
  {
    test: /\bci\/?cd\b/i,
    concepts: ["Programming", "System Design"],
    claim:
      "CI/CD is a contract: git is the source of truth, and a pipeline turns a commit into a tested, deployable artifact.",
    mechanism:
      "On push: checkout → install → test/lint → build artifact → deploy or promote. The invariant is reproducibility: the same SHA should produce the same artifact.",
    remember: [
      "CI answers 'does this SHA pass the gates?'; CD answers 'is this artifact running in an environment?'.",
      "Cache and secrets are the usual footguns — they make the pipeline lie.",
      "If you cannot replay a SHA, you do not have CI. You have a script that ran once.",
    ],
    caveats: [
      "Green checkmarks that skip tests or mutate production from a laptop.",
    ],
    useWhen: "a 'works on my machine' deploy needs a real gate.",
    questions: [
      "What artifact is produced, and where is it stored?",
      "Which step would you refuse to skip on main?",
      "How do you roll back one SHA?",
    ],
    takeaways: [
      "Treat the pipeline as the only allowed path to production.",
      "Make the artifact the unit of deploy, not the repo checkout on the server.",
    ],
  },
  {
    test: /\bdocker\b/i,
    concepts: ["System Design", "Programming"],
    claim:
      "Docker packages a process plus its filesystem. An image is a layered snapshot; a container is a running instance with namespaces and a writable layer.",
    mechanism:
      "Build (Dockerfile → layers) is separate from run (namespaces, cgroups, mounts). Networking and volumes are how that isolated process talks to the host.",
    remember: [
      "Image ≠ container. Rebuild the image when dependencies change; restart the container when config changes.",
      "PID 1, signals, and bind mounts explain most 'it died in Docker' bugs.",
      "A fat image is a supply-chain and start-time cost, not a convenience.",
    ],
    caveats: [
      "Using Docker as a substitute for understanding the process you are isolating.",
    ],
    useWhen: "the same app behaves differently on a laptop vs a container.",
    questions: [
      "What is in the image vs what is mounted at runtime?",
      "Which namespace would you inspect first when the network 'doesn't work'?",
      "What would you delete from the Dockerfile and still ship?",
    ],
    takeaways: [
      "Sketch image layers before adding another FROM.",
      "Name the process, the ports, and the volumes in one sentence.",
    ],
  },
  {
    test: /\b(jwt|bearer|basic auth|authentication concepts)\b/i,
    concepts: ["Authentication", "System Design"],
    claim:
      "Auth is proving who the caller is. Basic, bearer tokens, and JWTs are different encodings of that proof — they are not interchangeable security models.",
    mechanism:
      "Basic sends credentials every request. A bearer token is an opaque string the server looks up. A JWT is a signed (sometimes encrypted) claim set the server can verify without a session row.",
    remember: [
      "JWT `alg` and key management are the attack surface; 'stateless' is a tradeoff, not a virtue.",
      "HTTPS is assumed. Tokens on the wire without TLS are just passwords with extra steps.",
      "Revocation is the hard part of JWTs; opaque sessions make logout easy and scale harder.",
    ],
    caveats: [
      "Putting secrets in JWT payloads, or treating 'logged in' as authorization.",
    ],
    useWhen: "an API tutorial says 'just add JWT' without naming verification, expiry, or revocation.",
    questions: [
      "What does the server still have to store?",
      "How do you revoke access before expiry?",
      "Is this authentication, authorization, or both being smuggled together?",
    ],
    takeaways: [
      "Name the credential, the verification step, and the revocation story.",
      "Never confuse identity with permission.",
    ],
  },
  {
    test: /\b(https?|ssl|tls)\b/i,
    concepts: ["System Design", "Authentication"],
    claim:
      "HTTP is plaintext request/response. TLS (historically 'SSL') is the handshake that authenticates the server and encrypts the bytes; HTTPS is HTTP over that channel.",
    mechanism:
      "Client verifies a certificate chain to a trusted CA, then derives session keys. After that, URLs, cookies, and JWTs are hidden from the path — but not from the endpoints.",
    remember: [
      "TLS protects the pipe, not the application. XSS and bad auth still work.",
      "Certificates expire; hostname mismatch is a real failure mode, not a browser quirk.",
      "HSTS and cookie `Secure` flags are how you stop downgrade/leak after the handshake.",
    ],
    caveats: [
      "Saying 'we use SSL' without knowing whether you mean certificates, ciphers, or just a padlock.",
    ],
    useWhen: "someone treats HTTPS as the whole security model.",
    questions: [
      "What is authenticated: the server, the client, or both?",
      "What still leaks (SNI, IP, timing) even with TLS?",
      "Where would you look if the cert is valid but the app is still phishable?",
    ],
    takeaways: [
      "Draw the handshake before memorizing cipher names.",
      "Protect cookies and tokens as if the path is hostile even after TLS.",
    ],
  },
  {
    test: /\b(mcp|rag|embedding|vector database|openclaw|pi agent|agent harness|adk|agentic)\b/i,
    concepts: ["AI Agents"],
    claim:
      "Agents are loops over tools plus memory. Reliability is state, retries, and permissions — not a clever system prompt.",
    mechanism:
      "Plan → act (tool call) → observe → update state. MCP/tool APIs are just function-call schemas. RAG is retrieve-then-generate: embeddings find chunks, the model writes with that context.",
    remember: [
      "Draw the control loop before picking a framework.",
      "Treat MCP/tool APIs as an attack surface (path traversal, prompt injection, over-broad scopes).",
      "RAG quality is chunking + retrieval eval, not 'we added a vector DB'.",
    ],
    caveats: [
      "Trusting the next-token model as if it were a transaction processor.",
    ],
    useWhen: "a demo hides the loop behind 'the agent just knows'.",
    questions: [
      "Where does state live, and what happens when it is wrong?",
      "Which tool permission would you refuse on day one?",
      "What eval would prove retrieval is helping, not cargo-culting?",
    ],
    takeaways: [
      "Name plan / act / observe before the logo.",
      "Write one eval that would change your mind.",
    ],
  },
  {
    test: /\b(vllm|gpus?|tpus?|cuda|nvidia|amd|helio|semiconductors?|photonic chips?)\b/i,
    concepts: ["GPUs", "Semiconductors", "Data Centers"],
    claim:
      "Accelerators turn matrix multiplies into tokens. The scarce resources are HBM, interconnect, and power — not 'a chip with more AI'.",
    mechanism:
      "Training is all-reduce across a cluster. Inference is memory-bandwidth + KV cache. vLLM-style engines batch and page KV so GPUs stay utilized.",
    remember: [
      "Separate chip capability from cluster capability (NVLink, TPU pod, networking).",
      "Utilization and tokens/$ beat peak FLOPs on a slide.",
      "Power and cooling cap how many racks you can actually turn on.",
    ],
    caveats: [
      "Comparing SKUs without naming batch size, context, and precision.",
    ],
    useWhen: "a keynote treats FLOPs as the product.",
    questions: [
      "Is the bottleneck compute, memory bandwidth, or network?",
      "What happens to this thesis if utilization stays low?",
      "Who captures margin: designer, foundry, cloud, or app?",
    ],
    takeaways: [
      "Follow the watt and the wafer, not the keynote.",
      "Name precision, batch, and context before comparing chips.",
    ],
  },
  {
    test: /\b(data cent(?:er|re)s?|electrical grid|power grid|powering the internet|ai infrastructure)\b/i,
    concepts: ["Data Centers", "Energy"],
    claim:
      "An AI data center is a power plant with a networking problem. Tokens out are limited by megawatts, interconnect queues, and water — not just GPUs.",
    mechanism:
      "Energy in → conversion/cooling → compute → network out. Interconnection and transformers are often slower than chip delivery.",
    remember: [
      "Translate 'capacity' into MW, utilization, and time-to-interconnect.",
      "Training clusters and inference clusters have different power shapes.",
      "Local politics (grid, land, water) can kill a site that looks fine on a slide.",
    ],
    caveats: [
      "Counting announced GW as if they were energized.",
    ],
    useWhen: "a company pledges 'AI capacity' without a substation date.",
    questions: [
      "Is the constraint generation, transmission, or interconnection?",
      "Who pays if utilization stays low?",
      "What is the capacity factor, not the nameplate?",
    ],
    takeaways: [
      "Start from the substation, then add the GPUs.",
      "Treat interconnection queues as part of the model.",
    ],
  },
  {
    test: /\b(nuclear|fusion|nuclear fuel)\b/i,
    concepts: ["Nuclear Energy", "Energy"],
    claim:
      "Nuclear is physics plus permitting. Nameplate GW is not delivered MWh; construction time and fuel cycle dominate the investment case.",
    mechanism:
      "Fission plants are capital-heavy, high-capacity-factor baseload. Fusion is still a science/engineering race on confinement, materials, and net energy — not a 2026 grid product.",
    remember: [
      "Capacity factor and interconnection beat 'clean energy' slogans.",
      "Fuel, waste, and relicensing are first-class constraints.",
      "AI load is a demand shock; it does not magically shorten build times.",
    ],
    caveats: [
      "Treating announced fusion milestones as equivalent to operating fission.",
    ],
    useWhen: "a pitch uses 'nuclear' as a vibe instead of a timeline.",
    questions: [
      "What is the capacity factor and the first-power date?",
      "Is the scarce input capital, skilled labor, or fuel?",
      "What would falsify the timeline next year?",
    ],
    takeaways: [
      "Translate every claim into MWh and a calendar.",
      "Separate operating reactors from science projects.",
    ],
  },
  {
    test: /\b(option|black-scholes|sharpe|h≈0\.1|h≈0.1)\b/i,
    concepts: ["Options Trading", "Markets"],
    claim:
      "An option is a defined payoff on an underlying. Price is a function of spot, strike, time, rates, and implied vol — not a bet on 'direction' alone.",
    mechanism:
      "Black–Scholes (and its descendants) hedge the directional risk and charge for residual vol. The Sharpe ratio is excess return per unit of volatility, not a moral grade.",
    remember: [
      "Draw the payoff diagram before watching another explainer.",
      "If you cannot name the hedge and the leftover risk, you are gambling.",
      "Implied vol is a market price, not a weather forecast.",
    ],
    caveats: [
      "'Easy money' language that ignores vol, theta, and the other side of the trade.",
    ],
    useWhen: "a beginner video skips the payoff and jumps to 'strategies'.",
    questions: [
      "What is the payoff, the hedge, and the leftover risk?",
      "Who is the other side, and why are they willing?",
      "How does this break when vol is wrong, not just direction?",
    ],
    takeaways: [
      "Prefer expected-value language over certainty language.",
      "Write the greeks you are actually selling.",
    ],
  },
  {
    test: /\bbonds?\b/i,
    concepts: ["Bonds", "Investing"],
    claim:
      "A bond is a loan with a price. Yield moves inverse to price; duration tells you how much the price jumps when rates move.",
    mechanism:
      "You are buying cashflows discounted at a rate that embeds credit risk, inflation, and term premium. 'Safe' is a claim about default and rate risk, not a vibe.",
    remember: [
      "Price ↓ when yields ↑. Duration is the sensitivity.",
      "Credit spread is the extra yield over a risk-free curve.",
      "A 60/40 portfolio is a rates-and-growth bet, not a law of nature.",
    ],
    caveats: [
      "Calling bonds 'safe' without naming duration and credit.",
    ],
    useWhen: "someone talks about 'the bond market' as a single thing.",
    questions: [
      "What cashflow are you buying, and at what duration?",
      "Which rate move would hurt this position most?",
      "Is this credit risk or rate risk?",
    ],
    takeaways: [
      "Write issuer, coupon, maturity, and duration on one line.",
      "Map the claim onto rates before adding a narrative.",
    ],
  },
  {
    test: /\b(petrodollar|hormuz)\b/i,
    concepts: ["Macroeconomics", "Geopolitics", "Energy"],
    claim:
      "Oil invoiced in dollars plus a chokepoint (Hormuz) is a monetary-and-logistics story, not a slogan about 'replacing the dollar'.",
    mechanism:
      "Demand for dollar reserves follows trade settlement, sanctions, and Treasury markets. A Strait closure is a supply shock that hits tanker rates, inflation, and risk assets first.",
    remember: [
      "Reserve-currency status is a stack: trade, law, capital markets — not a single commodity.",
      "Hormuz matters because alternatives are slow and expensive, not because oil 'is' the dollar.",
      "Second-order effects: shipping insurance, diesel, and import-dependent allies.",
    ],
    caveats: [
      "Treating every war headline as an imminent dollar collapse.",
    ],
    useWhen: "a video claims this conflict 'replaces the dollar'.",
    questions: [
      "What settlement system would have to replace Treasuries, not just oil invoices?",
      "Which importer's constraint is binding?",
      "What would a falsifying headline look like next month?",
    ],
    takeaways: [
      "Start from tanker routes and settlement, then add ideology.",
      "Separate a price spike from a regime change.",
    ],
  },
  {
    test: /\b(the fed|federal reserve|us debt|debt bomb|debt crisis)\b/i,
    concepts: ["Macroeconomics", "Markets"],
    claim:
      "The Fed sets a policy rate and runs a balance sheet under a dual mandate. Treasury supply and deficits are a fiscal story that the Fed can only transform, not erase.",
    mechanism:
      "Higher policy rates raise discount rates and tighten credit. Debt service is rates × outstanding stock. 'The crash' is a claim about which market clears first: labor, credit, or asset prices.",
    remember: [
      "Name the instrument (FFR, QT/QE, forward guidance) before arguing.",
      "Inflation vs employment is a tradeoff, not a puzzle.",
      "A high debt/GDP ratio matters through rollover and the term premium.",
    ],
    caveats: [
      "Treating the Fed as a conspiracy or as omnipotent.",
    ],
    useWhen: "a headline blames 'the Fed' without naming a tool.",
    questions: [
      "Which variable is the Fed targeting, and which is the side effect?",
      "Who holds the debt, and when does it roll?",
      "What would a soft-landing print look like?",
    ],
    takeaways: [
      "Write the causal chain: tool → financial condition → real economy.",
      "Separate fiscal issuance from monetary policy.",
    ],
  },
  {
    test: /\b(private equity|private credit|blackstone|blackrock)\b/i,
    concepts: ["Private Equity", "Investing"],
    claim:
      "PE/private credit are claims on cashflows that do not trade daily. Illiquidity, leverage, and fee stacks are the product — not a footnote.",
    mechanism:
      "Buy with debt, improve (or strip) operations, exit to another buyer or the public market. Private credit is originated loans sitting in funds that promise yield without a public mark.",
    remember: [
      "Ask who is the LP, what is the leverage, and when is the exit.",
      "A smooth NAV can be a marking convention, not low risk.",
      "Asset-manager AUM is not the same as the economics of the underlying companies.",
    ],
    caveats: [
      "Confusing BlackRock (index/ETF giant) with Blackstone (alts/PE) or treating AUM as 'they own the economy' without naming the vehicle.",
    ],
    useWhen: "a scare headline uses a logo instead of a capital structure.",
    questions: [
      "What cashflow is being purchased, and who is junior?",
      "What happens if exits freeze?",
      "Is this a management-fee story or an investment-return story?",
    ],
    takeaways: [
      "Write the stack: LP → fund → leverage → company cashflow.",
      "Treat marks as a hypothesis.",
    ],
  },
  {
    test: /\b(hedge fund|jane street|citadel|goldman)\b/i,
    concepts: ["Hedge Funds", "Markets"],
    claim:
      "A hedge fund is a compensation and risk-limit wrapper around a strategy. The edge is process + capital, not a secret ticker.",
    mechanism:
      "Strategies (MM, arb, macro, quant) take bounded risk, mark daily, and get paid on performance. Market-making shops win on inventory, information, and infrastructure.",
    remember: [
      "Ask what risk they are paid to hold, and who is the other side.",
      "Hiring and tooling (GPUs, data) are part of the strategy.",
      "A bank franchise (deposits, balance sheet) is a different machine than a hedge fund.",
    ],
    caveats: [
      "Romanticizing the brand while skipping the risk book.",
    ],
    useWhen: "a career or culture video substitutes a logo for a P&L.",
    questions: [
      "What is the actual edge: speed, model, balance sheet, or franchise?",
      "How is risk cut when the model is wrong?",
      "What would you need to replicate 1% of this at a laptop scale?",
    ],
    takeaways: [
      "Name the strategy and the constraint before the prestige.",
      "Prefer expected-value language over myth.",
    ],
  },
  {
    test: /\b(startup|yc|funding|valuation|holding company|saas)\b/i,
    concepts: ["Startups"],
    claim:
      "A startup is a machine that buys distribution with capital under uncertainty. Valuation is a story about that machine's cashflows.",
    mechanism:
      "Raise → spend on learning/distribution → hope the next round or cashflows justify it. Unit economics (CAC, payback, gross margin) are the adult conversation.",
    remember: [
      "Write cash-in / cash-out on one line.",
      "Valuation is a hypothesis, not a grade.",
      "Who is the customer vs who is merely a user?",
    ],
    caveats: [
      "Confusing a funding announcement with a business.",
    ],
    useWhen: "a raise or 'AI SaaS' demo skips unit economics.",
    questions: [
      "Which milestone would make this raise unnecessary?",
      "What is the actual payback, not the narrative?",
      "What dies if the next round does not close?",
    ],
    takeaways: [
      "Treat valuation as a discounted claim, not a compliment.",
      "Name the distribution channel before the model.",
    ],
  },
  {
    test: /\bmonroe doctrine\b/i,
    concepts: ["Geopolitics"],
    claim:
      "The Monroe Doctrine (1823) asserted a US sphere in the Western Hemisphere: no new European colonies, and a claim that meddling here is a threat.",
    mechanism:
      "It is a policy signal, not a statute. Later corollaries (Roosevelt, Cold War, today) reuse the brand for very different force postures.",
    remember: [
      "Separate the 1823 text from later uses (gunboat, Cold War, 21st-century deployments).",
      "Sphere-of-influence logic is logistics + domestic politics, not a slogan.",
      "Ask which actor's domestic constraint is driving the external move.",
    ],
    caveats: [
      "Treating 'Monroe' as a single unchanging law.",
    ],
    useWhen: "a headline uses the doctrine as a magic word.",
    questions: [
      "What resource or chokepoint is actually in dispute?",
      "Which corollary is being invoked, and by whom?",
      "What would a falsifying headline look like next month?",
    ],
    takeaways: [
      "Start from the map, then add the brand name.",
      "Track second-order effects on alliances and shipping.",
    ],
  },
  {
    test: /\b(obsidian|deep work|second brain|read like)\b/i,
    concepts: ["Learning Systems", "Obsidian", "Deep Work"],
    claim:
      "Retention is a system: capture → encode → retrieve. Tools only matter if they force you to retrieve later.",
    mechanism:
      "A note is useful when it has a claim, links, and a question you can fail. Wiki-links raise clustering; flashcards force recall.",
    remember: [
      "Write one retrieval question before closing the note.",
      "Link to a concept node instead of leaving an orphan file.",
      "Highlighting is not encoding.",
    ],
    caveats: [
      "Collecting tools (Obsidian, AI) as a substitute for retrieval practice.",
    ],
    useWhen: "a setup video leaves you with a pretty vault and no questions.",
    questions: [
      "What will you retrieve a week later without rewatching?",
      "Where does this attach to a project, not just a folder?",
      "What belongs on a flashcard?",
    ],
    takeaways: [
      "Prefer a short linked note over a long unread one.",
      "Make the next action a question, not another plugin.",
    ],
  },
  {
    test: /\b(normalization vs standardization|standardization)\b/i,
    concepts: ["Machine Learning"],
    claim:
      "Normalization and standardization are different rescalings of features. They change optimizer geometry, not the meaning of the target.",
    mechanism:
      "Min-max maps to a range (often [0,1]). Standardization (z-score) centers at mean 0 and variance 1. Fit on train only — otherwise you leak.",
    remember: [
      "Fit scalers on train, apply to val/test. Leakage makes you look smart.",
      "Tree models often care less; gradient methods care more.",
      "Outliers punish z-scores; min-max punishes future values outside the train range.",
    ],
    caveats: [
      "Using the words interchangeably, or scaling the target by accident.",
    ],
    useWhen: "a pipeline 'just StandardScaler()'s everything.",
    questions: [
      "What is the prediction target in one sentence?",
      "Where could train/test leakage sneak in?",
      "Which classical baseline would you demand first?",
    ],
    takeaways: [
      "Name the scaler and the split before the architecture.",
      "Prefer a dumb baseline over a glamorous net.",
    ],
  },
  {
    test: /\b(system design|load balanc|caching|cdn|web app architecture)\b/i,
    concepts: ["System Design"],
    claim:
      "System design is tradeoffs among latency, consistency, cost, and failure domains. Diagram the request path.",
    mechanism:
      "Client → edge/CDN → load balancer → app → cache → database. Each hop adds a failure mode and a consistency story.",
    remember: [
      "Name the consistency model you are actually getting.",
      "Cache is a correctness bug waiting to happen unless you define TTL and invalidation.",
      "The database is not 'the bottleneck' until you have measured the hop.",
    ],
    caveats: [
      "Memorizing tool names without a sequence diagram.",
    ],
    useWhen: "an interview or tutorial lists buzzwords instead of a request trace.",
    questions: [
      "Walk one request from client to disk. Where can it fail?",
      "Which constraint is binding: throughput, consistency, or cost?",
      "What would you delete and still ship?",
    ],
    takeaways: [
      "Sketch the sequence diagram before the logo salad.",
      "Write the SLO, then pick the cache.",
    ],
  },
  {
    test: /\b(cloud computing|aws|azure|gcp)\b/i,
    concepts: ["Cloud Computing"],
    claim:
      "Cloud is other people's computers with APIs for compute, storage, and identity. The product is elasticity and an IAM model — not 'the internet'.",
    mechanism:
      "Regions, AZs, VPCs, and managed services trade CapEx for a bill and a shared-responsibility chart. Multi-cloud is a strategy only if you have named the lock-in you are avoiding.",
    remember: [
      "IAM and networking are the real beginner walls.",
      "A managed service is an API + an outage domain you do not control.",
      "Egress and idle reserved capacity are how bills explode.",
    ],
    caveats: [
      "Treating AWS/Azure/GCP as interchangeable stickers.",
    ],
    useWhen: "a 4-minute explainer skips IAM, regions, and the bill.",
    questions: [
      "What fails if this AZ disappears?",
      "Who can assume this role?",
      "What would this cost if traffic 10×?",
    ],
    takeaways: [
      "Draw the trust boundary (account, VPC, identity) first.",
      "Name one service you would refuse to use on day one.",
    ],
  },
  {
    test: /\bbitcoin\b/i,
    concepts: ["Markets"],
    claim:
      "Bitcoin is a replicated ledger with a proof-of-work consensus rule. The 'coin' is an unspent output; the scarce resource is valid block space and energy.",
    mechanism:
      "Miners expend energy to append blocks; nodes verify. Settlement is probabilistic until enough work sits on top. There is no customer-support undo.",
    remember: [
      "Keys control coins; exchanges are custodians.",
      "PoW ties security to energy and hardware, not to a board vote.",
      "Price is not the protocol.",
    ],
    caveats: [
      "Confusing the asset, the protocol, and the brokerage app.",
    ],
    useWhen: "an explainer starts from price and never reaches UTXOs or consensus.",
    questions: [
      "What is being verified, and by whom?",
      "What happens if you lose the key?",
      "Which failure is social (exchange) vs protocol?",
    ],
    takeaways: [
      "Separate consensus rules from market narrative.",
      "Write 'who can censor this transaction?' in one sentence.",
    ],
  },
  {
    test: /\bquantum|qubit|psiquantum|photonic chip\b/i,
    concepts: ["Quantum Computing"],
    claim:
      "Quantum computing is a representation: states as vectors, operations as unitaries, hardware as an expensive approximation of that math.",
    mechanism:
      "Useful algorithms (Shor, Grover, simulation) assume error-corrected logical qubits. Today's machines are noisy; error correction, algorithms, and capital are different bottlenecks.",
    remember: [
      "Separate the linear-algebra model from the physics implementation.",
      "Ask who pays for the qubits before believing the timeline.",
      "Photonic vs superconducting is a packaging and error-model debate, not a brand war.",
    ],
    caveats: [
      "Marketing that treats a noisy device as a cryptographically relevant computer.",
    ],
    useWhen: "a hardware reveal skips logical-qubit counts and error rates.",
    questions: [
      "What is actually quantum here versus classical simulation?",
      "Which bottleneck dominates: error correction, algorithms, or capital?",
      "How would you explain the core idea with Dirac notation?",
    ],
    takeaways: [
      "Demand logical qubits and error rates, not qubit marketing counts.",
      "Keep Shor and Grover in different mental boxes.",
    ],
  },
  {
    test: /\b(llm|large language model|deepseek|claude|chatgpt|openai|anthropic|karpathy|vibe coding|token)\b/i,
    concepts: ["Large Language Models"],
    claim:
      "An LLM is a next-token model with a training recipe (pretrain, post-train, tools). The durable object is the stack and its economics — not the demo.",
    mechanism:
      "Pretrain compresses text into weights. Post-train (SFT/RLHF/RLAIF) shapes behavior. Tool loops make it look agentic. Tokens, context, and evals decide cost.",
    remember: [
      "Name the layer (pretrain, post-train, tool loop) before arguing about 'AI'.",
      "Write one eval that would change your mind.",
      "A cheaper open model can still lose on reliability, not just on a chatbot vibe.",
    ],
    caveats: [
      "Trusting fluency as competence, especially inside an agent loop.",
    ],
    useWhen: "a race narrative (OpenAI vs Anthropic, DeepSeek, etc.) skips evals and cost.",
    questions: [
      "Which scarce resource is this video actually about: data, compute, or evals?",
      "What failure mode appears when you trust the next-token model as an agent?",
      "How would you test the claim without a vendor slide?",
    ],
    takeaways: [
      "Separate capability demos from production evals.",
      "Follow tokens/$ and refusal behavior, not the livestream.",
    ],
  },
  {
    test: /\b(machine learning|deep learning|neural|alphafold|diffusion|cs229|normalization)\b/i,
    concepts: ["Machine Learning"],
    claim:
      "ML is compressed experience plus a loss. The question is always: what is being optimized, on what data, with what leakage?",
    mechanism:
      "Pick a target, a dataset, a model class, and a loss. Generalization is the gap between train and the world. Architecture is secondary until the target is clear.",
    remember: [
      "State the prediction target in one sentence.",
      "Prefer a dumb baseline over a glamorous architecture.",
      "Leakage (time, identity, preprocessing) is the silent cheat code.",
    ],
    caveats: [
      "Calling everything 'AI' when it is a supervised loss on a spreadsheet.",
    ],
    useWhen: "a 17-minute algorithm dump never names a loss or a split.",
    questions: [
      "What is the loss implied by this title?",
      "Where could train/test leakage make it look smarter than it is?",
      "What classical baseline would you demand first?",
    ],
    takeaways: [
      "Write target + data + leakage check before the architecture.",
      "Keep generative, supervised, and scientific-tool uses in different boxes.",
    ],
  },
  {
    test: /\b(war|iran|israel|china|taiwan|sudan|hormuz|geopolitic|military|ukraine|andriivka|ecuador|middle east)\b/i,
    concepts: ["Geopolitics"],
    claim:
      "Geopolitics is incentives plus logistics: energy, chokepoints, coalitions, and time. Avoid moralizing until the map is clear.",
    mechanism:
      "Actors move under domestic constraints. Weapons, tankers, and alliances are the state. Narratives arrive after the supply line.",
    remember: [
      "Start from the map and the supply line, then add ideology.",
      "Track second-order effects on energy, shipping, and rates.",
      "A documentary or frontline piece is evidence about one place, not a grand theory.",
    ],
    caveats: [
      "Treating every clip as a complete explanation of 'the war'.",
    ],
    useWhen: "a crisis video skips the chokepoint and starts from a speech.",
    questions: [
      "What resource or chokepoint is actually in dispute?",
      "Which actor's domestic constraint is driving the external move?",
      "What would a falsifying headline look like next month?",
    ],
    takeaways: [
      "Write the logistics sentence first.",
      "Separate reporting (what happened) from strategy (why).",
    ],
  },
  {
    test: /\b(invest|stock|etf|401|ira|buffett|wealth|capital allocation|real estate vs stocks)\b/i,
    concepts: ["Investing"],
    claim:
      "Investing is buying a claim on future cashflows at a price, under a regime (rates, inflation, growth). Advice is only useful if you can name the regime.",
    mechanism:
      "Price is discounted cashflow plus a risk premium. Leverage and time change the distribution. 'Get rich' lists are usually risk lists in costume.",
    remember: [
      "Write the asset, the cashflow, and the risk in one sentence.",
      "Map the claim onto rates, inflation, or growth — pick a primary driver.",
      "Personal constraints (horizon, job, tax wrapper) beat generic tier lists.",
    ],
    caveats: [
      "Copying a billionaire's cash pile without their liabilities and time horizon.",
    ],
    useWhen: "a money video ranks products without naming cashflows.",
    questions: [
      "What cashflow is being purchased, and at what discount rate?",
      "Which macro variable would invert this advice?",
      "Is this compounding, leverage, or a narrative about both?",
    ],
    takeaways: [
      "Prefer a written policy to a vibe.",
      "Treat 'this time is different' as a testable claim.",
    ],
  },
  {
    test: /\b(python|programming|software|engineer|github|loop engineering|fastapi|web scraping)\b/i,
    concepts: ["Programming"],
    claim:
      "The skill is modeling state and interfaces. Syntax is the cheap part.",
    mechanism:
      "Name the inputs, the invariant, and the failure modes. Tools (FastAPI, GitHub, scrapers) are adapters around that model.",
    remember: [
      "Rebuild the idea in 20 lines before collecting another tutorial.",
      "Name the interface, not just the library.",
      "A senior review flags invariants and edge cases first.",
    ],
    caveats: [
      "Collecting frameworks as a substitute for a tiny working model.",
    ],
    useWhen: "a 2-minute tool explainer never states the invariant.",
    questions: [
      "What invariant is this tool trying to protect?",
      "How would you implement a tiny version from scratch?",
      "What would a senior review flag first?",
    ],
    takeaways: [
      "Write the interface before the import.",
      "Prefer a failing test that names the bug.",
    ],
  },
];
