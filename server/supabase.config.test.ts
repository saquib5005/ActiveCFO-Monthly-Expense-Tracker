import { describe, expect, it } from "vitest";

const supabaseUrl = "https://himcjclfbzoposhxmlfg.supabase.co";

describe("Supabase service configuration", () => {
  it("authenticates the server against the ActiveCFO Supabase REST gateway", async () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.status, "Supabase REST gateway must accept the server credential").toBe(200);
  });
});
