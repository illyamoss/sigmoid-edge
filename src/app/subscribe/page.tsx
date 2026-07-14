import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubscribePageProps = {
  searchParams: Promise<{ score?: string; ref?: string }>;
};

export default async function SubscribePage({
  searchParams,
}: SubscribePageProps) {
  const params = await searchParams;
  const score = params.score ? Number.parseFloat(params.score) : null;
  const ref = params.ref ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Lock className="h-8 w-8 text-zinc-300" />
          </div>
          <CardTitle className="text-2xl">Premium Content</CardTitle>
          <CardDescription>
            This article is exclusive to subscribers. Get unlimited access
            to all premium analysis, early releases, and ad-free reading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-center">
            <div className="text-3xl font-bold text-zinc-100">$9.99</div>
            <p className="text-sm text-zinc-500">per month · cancel anytime</p>
          </div>
          <Button disabled className="w-full">
            Subscribe with Stripe
          </Button>
          <p className="text-center text-xs text-zinc-600">
            Stripe payment integration coming soon
          </p>
          {score !== null && (
            <p className="text-center text-xs text-zinc-600">
              Propensity score: {(score * 100).toFixed(1)}%
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <a
            href={ref ? `/blog` : "/blog"}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ← Back to blog
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}