import ReactMarkdown from "react-markdown";

// markdown écrit par l'admin : on ignore le HTML brut et on sécurise les liens externes
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      skipHtml
      components={{
        a: ({ href, children: c }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {c}
          </a>
        ),
        h1: ({ children: c }) => <h3>{c}</h3>,
        h2: ({ children: c }) => <h3>{c}</h3>,
        img: () => null,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
