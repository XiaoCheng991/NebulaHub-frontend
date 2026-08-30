export default function AboutPage() {
  const profile = {
    name: "Kyon",
    alias: "小橙991",
    github: "https://github.com/XiaoCheng991",
    email: "kyon991@proton.me",
    location: "East Asia",
    csdn: "https://blog.csdn.net/qq_60985619",
    gitee: "https://gitee.com/XiaoCheng991",
  };

  const skills = [
    {
      category: "backend",
      label: "BACKEND",
      items: ["Java", "SpringBoot / SpringCloud", "MyBatis-Plus", "MySQL / Redis"],
    },
    {
      category: "ai",
      label: "AI / ML",
      items: ["Python", "LangChain", "OpenClaw", "多模态大模型"],
    },
    {
      category: "frontend",
      label: "FRONTEND",
      items: ["JavaScript", "TypeScript", "React", "Next.js"],
    },
    {
      category: "devops",
      label: "DEVOPS",
      items: ["Docker", "Git / GitLab", "Linux", "Jenkins CI/CD"],
    },
    {
      category: "data",
      label: "DATA",
      items: ["Spark", "达梦 DM8", "数据治理", "数据可视化"],
    },
    {
      category: "other",
      label: "OTHER",
      items: ["Go (Gin)", "RabbitMQ", "K8s 基础"],
    },
  ];

  const experiences = [
    {
      company: "某大型零售电商集团",
      period: "2025.07 ~ 至今",
      role: "全栈开发工程师",
      points: [
        "集团管培生，10个月完成全链路岗位培训，荣获2025年度优秀员工奖（TOP10%）",
        "驻场国际知名快餐企业总部参与主数据中台项目，获甲方书面认可",
        "直连商品中台提供实时库存/价格查询，响应时间 ≤500ms",
        "个人自学 OpenClaw、LangChain 等AI工具和框架",
      ],
    },
    {
      company: "某互联网科技企业",
      period: "2024.05 ~ 2024.11",
      role: "Java 开发工程师",
      points: [
        "负责高校教育平台、教考分离平台等3个核心系统后端研发",
        "EasyExcel + MinIO 处理文件导出5000+次，效率提升40%",
        "交付健壮接口80+个，接口调用成功率99.9%",
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <section className="mb-16 pt-8">
        <div className="flex items-center gap-2 text-xs font-mono text-primary/60 mb-4">
          <span>{`// whoami`}</span>
          <span className="cursor-blink" />
        </div>
        <div className="flex items-start gap-6 flex-wrap">
          {/* Avatar */}
          <div className="shrink-0">
            <img
              src="/avatar/XiaoCheng991.jpeg"
              alt="avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border border-primary/30 object-cover"
              width={128}
              height={128}
              decoding="async"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {profile.name}
              <span className="text-primary text-glow ml-2 text-lg font-mono">
                {`@${profile.alias}`}
              </span>
            </h1>
            <p className="text-sm text-foreground/50 font-mono mb-2">
              {`// 全栈 + AI 开发`}
            </p>
            <p className="text-sm text-foreground/40 max-w-lg leading-relaxed">
              数据科学与大数据技术 · 2025届<br />
              有互联网科技企业实习经历，目前在一家大型零售业集团做全栈开发。<br />
              正在从 Java 向 AI 迈进，目标：让代码不只是代码。
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xs font-mono text-primary tracking-wider">
            {`[ contact ]`}
          </h2>
          <span className="flex-1 h-[1px] bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactItem
            label="GITHUB"
            value="github.com/XiaoCheng991"
            href={profile.github}
          />
          <ContactItem
            label="EMAIL"
            value="kyon991@proton.me"
            href={`mailto:${profile.email}`}
          />
          <ContactItem
            label="LOCATION"
            value={profile.location}
            href="#"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <a href={profile.csdn} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-foreground/40 hover:text-primary transition-colors">
            [ CSDN ]
          </a>
          <a href={profile.gitee} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-foreground/40 hover:text-primary transition-colors">
            [ GITEE ]
          </a>
        </div>
      </section>

      {/* Experience */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xs font-mono text-primary tracking-wider">
            {`[ experience ]`}
          </h2>
          <span className="flex-1 h-[1px] bg-border" />
        </div>
        <div className="space-y-6">
          {experiences.map((exp, i) => (
            <div key={i} className="pl-6 border-l-2 border-primary/20 relative">
              <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-primary/30 rounded-full" />
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground">{exp.company}</h3>
                <span className="text-xs font-mono text-foreground/30">{exp.period}</span>
              </div>
              <div className="text-xs font-mono text-primary/60 mb-2">{exp.role}</div>
              <ul className="text-sm text-foreground/50 space-y-1">
                {exp.points.map((point, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-primary/40 mt-0.5 shrink-0">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xs font-mono text-primary tracking-wider">
            {`[ skills ]`}
          </h2>
          <span className="flex-1 h-[1px] bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skills.map((s) => (
            <div
              key={s.label}
              className="border border-border bg-card/30 p-4 hover:border-primary/30 transition-colors"
            >
              <div className="text-xs font-mono text-primary/50 mb-3">{s.label}</div>
              <div className="flex flex-wrap gap-2">
                {s.items.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-mono px-2 py-1 bg-muted text-foreground/50 border border-border"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xs font-mono text-primary tracking-wider">
            {`[ education ]`}
          </h2>
          <span className="flex-1 h-[1px] bg-border" />
        </div>
        <div className="border border-border bg-card/30 p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">某工业大学</div>
            <div className="text-xs font-mono text-foreground/40 mt-1">
              数据科学与大数据技术 · 本科 · 2021.09 ~ 2025.06
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="mb-8">
        <blockquote className="border-l-2 border-primary/30 pl-4 py-3 text-sm text-foreground/40 italic font-mono">
          {"代码不只是代码。"}
        </blockquote>
      </section>
    </div>
  );
}

function ContactItem({ label, value, href }: { label: string; value: string; href: string }) {
  if (href === "#") {
    return (
      <div className="border border-border bg-card/30 p-3 flex items-center gap-3">
        <span className="text-xs font-mono text-primary/40 w-20 shrink-0">{label}</span>
        <span className="text-xs font-mono text-foreground/50">{value}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="border border-border bg-card/30 p-3 flex items-center gap-3 hover:border-primary/30 hover:text-primary transition-colors group"
    >
      <span className="text-xs font-mono text-foreground/30 w-20 shrink-0 group-hover:text-primary/50 transition-colors">{label}</span>
      <span className="text-xs font-mono text-foreground/50 truncate">{value}</span>
    </a>
  );
}
