/**
 * useGitHubData.js — GitSkyline
 *
 * Fetches ALL years of contribution data from our own Vercel serverless
 * function at /api/contributions/[username].
 *
 * No token needed on the client — token lives on the server.
 *
 * Returns data as [{ date: "YYYY-MM-DD", count: number }]
 */

import { useState, useCallback } from "react";

export function useGitHubData() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (username) => {
    if (!username?.trim()) {
      setError("Please enter a GitHub username.");
      return false;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/contributions/${encodeURIComponent(username.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Could not load data for "${username}".`);
      }

      if (!json.contributions || json.contributions.length === 0) {
        throw new Error(`No contribution data found for "${username}".`);
      }

      setProfile({
        name: username.trim(),
        avatarUrl: `https://github.com/${username.trim()}.png?size=32`,
        years: json.years ?? [],
      });
      setData(json.contributions);
      setLoading(false);
      return true;

    } catch (err) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, []);

  return { data, profile, loading, error, fetchData };
}