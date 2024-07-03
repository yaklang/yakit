module.exports = async function (context) {
    const archMap = {
        1: 'x64',
        3: 'arm64',
    };
    const arch = archMap[context.arch];

    /**linux */
    /** 1:x64 3:arm64 */
    const linuxConfig = context.electronPlatformName === 'linux' ? context.packager.config.linux : null;
    if (linuxConfig) {
        const linuxExtraFiles = [
            {
                "from": "bins/flag.linux.txt",
                "to": "bins/flag.linux.txt",
            },
        ]
        switch (arch) {
            case 'arm64':
                linuxConfig.artifactName = '${productName}-${version}-linux-arm64.${ext}';
                linuxConfig.extraFiles = [
                    ...linuxExtraFiles,
                    {
                        "from": "bins/yak_linux_arm64.zip",
                        "to": "bins/yak.zip",
                    },
                ]
                break;
            case 'x64':
                linuxConfig.artifactName = '${productName}-${version}-linux-amd64.${ext}';
                linuxConfig.extraFiles = [
                    ...linuxExtraFiles,
                    {
                        "from": "bins/yak_linux_amd64.zip",
                        "to": "bins/yak.zip",
                    },
                ]
                break;

            default:
                break;
        }
        context.packager.config.linux = linuxConfig
    }
    /**mac */
    /** 1:x64 3:arm64 */
    const macConfig = context.electronPlatformName === 'darwin' ? context.packager.config.mac : null;
    if (macConfig) {
        const darwinExtraFiles = [
            {
                "from": "bins/flag.darwin.txt",
                "to": "bins/flag.darwin.txt",
            },
        ]
        switch (arch) {
            case 'arm64':
                macConfig.extraFiles = [
                    ...darwinExtraFiles,
                    {
                        "from": "bins/yak_darwin_arm64.zip",
                        "to": "bins/yak.zip",
                    },
                ]
                break;
            case 'x64':
                macConfig.extraFiles = [
                    ...darwinExtraFiles,
                    {
                        "from": "bins/yak_darwin_amd64.zip",
                        "to": "bins/yak.zip",
                    },
                ]
                break;

            default:
                break;
        }
        context.packager.config.mac = macConfig
    }
};