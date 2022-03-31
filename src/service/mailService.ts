import { Options } from 'nodemailer/lib/mailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { saveMail } from './logService';
import { RedisService } from './redisService';

export type MailOption = Options;
/**
 *
 *
 * @param {*} mail 接受邮箱
 * @param {*} title 标题
 * @param {*} subject 主题
 * @param {*} body  发送text或者html格式 // text: 'Hello world?', // plain text body
 * @returns
 */
export async function sendMail(
  mail: string,
  title: string,
  subject: string,
  body: string
) {
  if (!mail) {
    throw new Error('email is null');
  }
  body = String(body);
  title = title || 'Ladis';
  if (title === '注册') body = `注册验证码：<strong>${body}</strong>`;
  if (title === '重置密码') body = `重置验证码：<strong>${body}</strong>`;
  subject = subject + title;
  const mailOptions: Options = {
    from: `"${title}" <260338538@qq.com>`,
    to: mail,
    subject,
    html: body,
  };

  return await new Promise<SMTPTransport.SentMessageInfo>((res, rej) => {
    RedisService.Secret.mail.sendMail(mailOptions, (error, info) => {
      if (error) rej(error);
      res(info);
    });
  })
    .then(el => {
      const data: Uart.logMailSend = {
        mails: mail.split(','),
        sendParams: mailOptions as any,
        Success: el as any,
      };
      saveMail(data);
      return data;
    })
    .catch(e => {
      const data: Uart.logMailSend = {
        mails: mail.split(','),
        sendParams: mailOptions as any,
        Error: e.response,
      };
      saveMail(data);
      return data;
    });
}
