/** Match sidebar nav items including optional query strings (e.g. Optimizer V2). */
export function isNavItemActive(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams | null,
  href: string
): boolean {
  const [path, queryString] = href.split("?");
  const pathMatch = pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatch) return false;

  if (!queryString) {
    if (path === "/eaf/optimizer") {
      return searchParams?.get("mode") !== "research";
    }
    return pathname === path || (pathname.startsWith(`${path}/`) && path !== "/eaf");
  }

  const expected = new URLSearchParams(queryString);
  for (const [key, value] of expected.entries()) {
    if (searchParams?.get(key) !== value) return false;
  }
  return pathname === path;
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, "get">;
