import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'openai', 'ws', 'google-auth-library'],
  turbopack: {},
  transpilePackages: ['@yatrasarthi/graph', '@yatrasarthi/llm', '@yatrasarthi/types'],
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
})(nextConfig);
