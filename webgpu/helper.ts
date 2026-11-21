export interface CreateResourcesOptions<
    Shaders extends string,
    BindGroupLayouts extends string,
    PipelineLayouts extends string,
    RenderPipelines extends string,
    Buffers extends string,
    Textures extends string,
    Samplers extends string,
    BindGroups extends string,
> {
    device: GPUDevice;

    shaders?: {
        [ShaderId in Shaders]: GPUShaderModuleDescriptor;
    };

    bindGroupLayouts?: {
        [BGLayoutId in BindGroupLayouts]: GPUBindGroupLayoutDescriptor;
    };

    pipelineLayouts?: {
        [PipelineLayoutId in PipelineLayouts]: (
            resources: {
                readonly bindGroupLayouts: Record<BindGroupLayouts, GPUBindGroupLayout>;
            },
        ) => GPUPipelineLayoutDescriptor;
    };

    renderPipelines?: {
        [RenderPipelineId in RenderPipelines]: (
            resources: {
                readonly shaders: Record<Shaders, GPUShaderModule>;
                readonly bindGroupLayouts: Record<BindGroupLayouts, GPUBindGroupLayout>;
                readonly pipelineLayouts: Record<PipelineLayouts, GPUPipelineLayout>;
            },
        ) => GPURenderPipelineDescriptor;
    };

    buffers?: {
        [BufferId in Buffers]: GPUBufferDescriptor;
    };

    textures?: {
        [TextureId in Textures]: GPUTextureDescriptor;
    };

    samplers?: {
        [SamplerId in Samplers]: GPUSamplerDescriptor;
    };

    bindGroups?: {
        [BindGroupId in BindGroups]: (
            resources: {
                readonly bindGroupLayouts: Record<BindGroupLayouts, GPUBindGroupLayout>;
                readonly buffers: Record<Buffers, GPUBuffer>;
                readonly textures: Record<Textures, GPUTexture>;
                readonly samplers: Record<Samplers, GPUSampler>;
            },
        ) => GPUBindGroupDescriptor;
    };
}

export interface CreateResourcesResult<
    Shaders extends string,
    BindGroupLayouts extends string,
    PipelineLayouts extends string,
    RenderPipelines extends string,
    Buffers extends string,
    Textures extends string,
    Samplers extends string,
    BindGroups extends string,
> {
    readonly shaders: Record<Shaders, GPUShaderModule>;
    readonly bindGroupLayouts: Record<BindGroupLayouts, GPUBindGroupLayout>;
    readonly pipelineLayouts: Record<PipelineLayouts, GPUPipelineLayout>;
    readonly renderPipelines: Record<RenderPipelines, GPURenderPipeline>;
    readonly buffers: Record<Buffers, GPUBuffer>;
    readonly textures: Record<Textures, GPUTexture>;
    readonly samplers: Record<Samplers, GPUSampler>;
    readonly bindGroups: Record<BindGroups, GPUBindGroup>;
}

/**
 * Create and link resources
 *
 * @param options Create options
 * @returns Resources
 */
export function createAndLinkResources<
    Shaders extends string = never,
    BindGroupLayouts extends string = never,
    PipelineLayouts extends string = never,
    RenderPipelines extends string = never,
    Buffers extends string = never,
    Textures extends string = never,
    Samplers extends string = never,
    BindGroups extends string = never,
>(
    options: CreateResourcesOptions<
        Shaders,
        BindGroupLayouts,
        PipelineLayouts,
        RenderPipelines,
        Buffers,
        Textures,
        Samplers,
        BindGroups
    >,
): CreateResourcesResult<
    Shaders,
    BindGroupLayouts,
    PipelineLayouts,
    RenderPipelines,
    Buffers,
    Textures,
    Samplers,
    BindGroups
> {
    const { device } = options;
    type Options = CreateResourcesOptions<
        Shaders,
        BindGroupLayouts,
        PipelineLayouts,
        RenderPipelines,
        Buffers,
        Textures,
        Samplers,
        BindGroups
    >;
    type Result = CreateResourcesResult<
        Shaders,
        BindGroupLayouts,
        PipelineLayouts,
        RenderPipelines,
        Buffers,
        Textures,
        Samplers,
        BindGroups
    >;

    const shaders = Object.fromEntries(
        Object
            .entries<NonNullable<Options["shaders"]>[Shaders]>(options.shaders ?? {})
            .map(([name, desc]) => [name, device.createShaderModule(desc)]),
    ) as Result["shaders"];

    const bindGroupLayouts = Object.fromEntries(
        Object
            .entries<NonNullable<Options["bindGroupLayouts"]>[BindGroupLayouts]>(options.bindGroupLayouts ?? {})
            .map(([name, desc]) => [name, device.createBindGroupLayout(desc)]),
    ) as Result["bindGroupLayouts"];

    const pipelineLayouts = Object.fromEntries(
        Object
            .entries<NonNullable<Options["pipelineLayouts"]>[PipelineLayouts]>(options.pipelineLayouts ?? {})
            .map(([name, desc]) => [name, desc({ bindGroupLayouts })] as const)
            .map(([name, desc]) => [name, device.createPipelineLayout(desc)]),
    ) as Result["pipelineLayouts"];

    const renderPipelines = Object.fromEntries(
        Object
            .entries<NonNullable<Options["renderPipelines"]>[RenderPipelines]>(options.renderPipelines ?? {})
            .map(([name, desc]) => [name, desc({ shaders, bindGroupLayouts, pipelineLayouts })] as const)
            .map(([name, desc]) => [name, device.createRenderPipeline(desc)]),
    ) as Result["renderPipelines"];

    const buffers = Object.fromEntries(
        Object
            .entries<NonNullable<Options["buffers"]>[Buffers]>(options.buffers ?? {})
            .map(([name, desc]) => [name, device.createBuffer(desc)]),
    ) as Result["buffers"];

    const textures = Object.fromEntries(
        Object
            .entries<NonNullable<Options["textures"]>[Textures]>(options.textures ?? {})
            .map(([name, desc]) => [name, device.createTexture(desc)]),
    ) as Result["textures"];

    const samplers = Object.fromEntries(
        Object
            .entries<NonNullable<Options["samplers"]>[Samplers]>(options.samplers ?? {})
            .map(([name, desc]) => [name, device.createSampler(desc)]),
    ) as Result["samplers"];

    const bindGroups = Object.fromEntries(
        Object
            .entries<NonNullable<Options["bindGroups"]>[BindGroups]>(options.bindGroups ?? {})
            .map(([name, desc]) => [name, desc({ bindGroupLayouts, buffers, textures, samplers })] as const)
            .map(([name, desc]) => [name, device.createBindGroup(desc)]),
    ) as Result["bindGroups"];

    return {
        shaders,
        bindGroupLayouts,
        pipelineLayouts,
        renderPipelines,
        buffers,
        textures,
        samplers,
        bindGroups,
    };
}
