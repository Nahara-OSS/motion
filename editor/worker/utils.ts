export function pathSegments(path: string, origin: readonly string[] = []): string[] {
    const resolved = [...origin];

    for (const segment of path.split("/").filter((segment) => segment.length > 0 && segment != ".")) {
        if (segment == "..") {
            if (resolved.length > 0) resolved.pop();
            continue;
        }

        resolved.push(segment);
    }

    return resolved;
}
