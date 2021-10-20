import { Provide, Inject, Init } from '@midwayjs/decorator';
import { getModelForClass } from '@typegoose/typegoose';
import { createTransport, Transporter } from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SecretApp } from '../entity/user';
import { Logs } from '../service/log';

@Provide()
export class Mail {
  transporter: Transporter<SMTPTransport.SentMessageInfo>;
  from: string;

  @Inject()
  Log: Logs;

  @Init()
  async init() {
    const key = await getModelForClass(SecretApp)
      .findOne({ type: 'mail' })
      .lean();
    this.transporter = createTransport({
      // host: 'smtp.ethereal.email',
      service: 'QQ', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
      /* port: 465, // SMTP 端口
            secureConnection: true, // 使用了 SSL */
      auth: {
        user: key.appid,
        // 这里密码不是qq密码，是你设置的smtp授权码
        pass: key.secret,
      },
    });

    this.from = key.appid;
  }

  /**
   *
   *
   * @param {*} mail 接受邮箱
   * @param {*} title 标题
   * @param {*} subject 主题
   * @param {*} body  发送text或者html格式 // text: 'Hello world?', // plain text body
   * @returns
   */
  async send(mail: string, title: string, subject: string, body: string) {
    body = String(body);
    title = title || 'Ladis';
    if (title == '注册') body = `注册验证码：<strong>${body}</strong>`;
    if (title == '重置密码') body = `重置验证码：<strong>${body}</strong>`;
    subject = subject + title;
    const mailOptions = {
      from: `"${title}" <${this.from}>`,
      to: mail,
      subject,
      html: body,
    };

    return await new Promise<SMTPTransport.SentMessageInfo>((res, rej) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) rej(error);
        res(info);
      });
    })
      .then(el => {
        const data: Uart.logMailSend = {
          mails: mail.split(','),
          sendParams: mailOptions,
          Success: el as any,
        };
        this.Log.saveMail(data);
        return data;
      })
      .catch(e => {
        const data: Uart.logMailSend = {
          mails: mail.split(','),
          sendParams: mailOptions,
          Error: e.response,
        };
        this.Log.saveMail(data);
        return data;
      });
  }
}
