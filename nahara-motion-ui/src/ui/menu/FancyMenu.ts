export interface BaseDropdownEntry<T extends string> {
    readonly type: T;
    readonly name: string;
    readonly description?: string;
    readonly icon?: any;
}

export interface SimpleDropdownEntry extends BaseDropdownEntry<"simple"> {
    click?(event: MouseEvent): any;
}

export interface TreeDropdownEntry extends BaseDropdownEntry<"tree"> {
    readonly children: DropdownEntry[];
}

export type DropdownEntry = SimpleDropdownEntry | TreeDropdownEntry;