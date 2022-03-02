import { Provide, Post, Inject, Controller, Body } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { OSSService } from '@midwayjs/oss';
import { MD5 } from 'crypto-js';

@Provide()
@Controller('/api/root', { middleware: ['root'] })
export class Oss {
  @Inject()
  ctx: Context;

  @Inject()
  ossService: OSSService;

  /**
   * 处理上传文件,转存到oss
   * @param data
   */
  @Post('/ossupload')
  async uploads() {
    const file = [this.ctx.request.files.file].flat()[0];
    const fileType = file.name.split('.').reverse()[0];
    return {
      code: 200,
      data: await this.ossService.put(
        `${file.type.split('/').reverse()[0]}/${MD5(
          file.name
        ).toString()}.${fileType}`,
        file.path
      ),
    };
  }

  /**
   * 列出oss中的文件
   * @param prefix
   * @returns
   */
  @Post('/ossFilelist')
  async ossFilelist(@Body() prefix?: string) {
    const files = await this.ossService.list({ prefix, 'max-keys': 1000 }, {});
    console.log(files);

    const data =
      Object.prototype.hasOwnProperty.call(files, 'objects') && files.objects
        ? files.objects.map(({ url, lastModified, size, name }) => ({
            url,
            lastModified,
            size,
            name,
          }))
        : [];
    return {
      code: 200,
      data,
    };
  }

  /**
   * 删除oss中的文件
   * @param names
   * @returns
   */
  @Post('/ossDelete')
  async ossDelete(@Body() names: string[]) {
    return {
      code: 200,
      data: await this.ossService.deleteMulti(names),
    };
  }
}
