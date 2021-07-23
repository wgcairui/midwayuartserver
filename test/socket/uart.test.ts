import { createBootstrap, } from '@midwayjs/mock'
import { join } from "path"
import { createSocketIOClient } from '@midwayjs/mock';


describe('/test/index.test.ts', () => {


    let app: any
    beforeAll(async () => {
        app = await createBootstrap(join(process.cwd(), 'bootstrap.js'));
        console.log('start');
    }, 30000)

    afterAll(async () => {
        await app.close()
    })


    it('should test create socket app', async () => {

        // 创建一个对应的客户端
        const client = await createSocketIOClient({
            port: 3000,
        });


        console.log('client ok');


        // 拿到结果返回
        const data = await new Promise(resolve => {
            client.on('registerSuccess', resolve);
            // 发送事件
            client.send('register', 1, 2, 3);
        });

        // 判断结果
        expect(data).toEqual({
            name: 'harry',
            result: 6,
        });

        // 关闭客户端
        client.close();


    });

});