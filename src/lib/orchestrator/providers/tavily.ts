import type { AppEnv } from "@/lib/env";

export type TavilySearchResult = {
  title?: string;
  url: string;
  content: string;
  score?: number;
};

export async function tavilySearch(
  query: string,
  env: AppEnv
): Promise<TavilySearchResult[]> {
  const key = env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("TAVILY_API_KEY missing");
  }
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    results?: Array<{
      title?: string;
      url: string;
      content?: string;
    }>;
  };
  const results = data.results ?? [];
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content ?? "",
    score: undefined,
  }));
}

export function fallbackTavilyResults(topic: string): TavilySearchResult[] {
  const q = encodeURIComponent(topic.slice(0, 80));
  return [
    {
      title: `${topic} — curated example (demo fallback)`,
      url: `https://example.com/topics?q=${q}`,
      content:
        "This is a demo fallback excerpt when Tavily is not configured. Enable TAVILY_API_KEY for live web search.",
    },
  ];
}
