import * as helper from "@nahara/motion-helper";

export type Variant<Dict> = {
    [Option in keyof Dict]: {
        readonly option: Option;
        readonly data: Dict[Option];
    };
}[keyof Dict];

export interface VariantCreateOptions<Dict> extends helper.host.TypeOptions<Variant<Dict>> {
    readonly options: {
        [Option in keyof Dict]: helper.host.LabelingOptions & {
            readonly dataType: Dict[Option] extends null ? null : helper.host.Type;
        };
    };
}

export function createVariant<Dict>(options: VariantCreateOptions<Dict>): helper.host.HostVariantType<Variant<Dict>> {
    return new helper.host.HostVariantType({
        ...options,
        variants: Object.fromEntries(
            // deno-lint-ignore no-explicit-any
            Object.entries<any>(options.options).map(([name, { dataType, ...options }]) => [name, {
                ...options,
                dataType,
                match: (self) =>
                    self.option == name
                        ? dataType != null
                            ? helper.host.MatchResult.matchedWith(self.data)
                            : helper.host.MatchResult.matched
                        : helper.host.MatchResult.notMatched,
                create: (_, data) => ({ option: name, data }),
            }]),
        ),
    });
}
