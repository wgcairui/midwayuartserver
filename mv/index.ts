import * as fs from "fs/promises"
import { join } from "path"
interface pesivUser {
    id: string;
    user: string;
    passwd: string;
    salt: string;
    name: string;
    tel: string;
    mail: string;
    devices: Set<string>;
}

const mv = async () => {

    // SELECT  [Id],[user_name],[user_pwd] ,[salt] ,[real_name],[telephone],[email]  FROM [LdsDB].[dbo].[Users]
    const user = await fs.readFile(join(process.cwd(), "user.txt"), "utf8")

    const userMap: Map<string, pesivUser> = new Map()

    user
        .split("\n")
        .map<pesivUser>(el => {
            const [id, user, passwd, salt, name, tel, mail] = el.split("\t")
            return { id, user, passwd, salt, name, tel, mail, devices: new Set() }
        })
        .forEach(el => {
            userMap.set(el.id, el)
        })


    // SELECT [UserId] ,[DevName],[DeviceCode] FROM [LdsDB].[dbo].[UserDevice]
    const userDevice = await fs.readFile(join(process.cwd(), "device.txt"), "utf8")

    // SELECT DIStinct [DeviceCode] FROM [LdsDB].[dbo].[DeviceHistory]
    //const device = await fs.readFile(join(process.cwd(), "hasdevice.txt"), "utf8")

    // const deviceSet: Set<string> = new Set(device.split("\n"))

    const deviceMap: Map<string, string> = new Map()
    const userDeviceMap: Map<string, Set<string>> = new Map()

    userDevice
        .split("\n")
        .map(el => {
            const [userId, DevName, deviceId] = el.split("\t")
            return { userId, DevName, deviceId }
        })
        // .filter(el => deviceSet.has(el.deviceId))
        .forEach(el => {
            if (el.userId && el.deviceId && el.deviceId.length === 12) {
                if (!userDeviceMap.has(el.userId)) {
                    userDeviceMap.set(el.userId, new Set())
                }
                deviceMap.set(el.deviceId, el.DevName)
                userDeviceMap.get(el.userId).add(el.deviceId)
            }
        })

    userDeviceMap.forEach((val, key) => {
        if (userMap.has(key)) {
            userMap.get(key).devices = val
        }

    })

    const hasUser = [...userMap.values()].filter(el => el.devices.size > 0).map(el => ({
        ...el,
        devs: [...el.devices.values()]
    }))
    {



        const j = hasUser.map(({ user, passwd, name, salt, tel, mail, devs }) => {

            const userinfo = {
                user,
                name: name || user.slice(user.length - 4),
                passwd,
                rgtype: "pesiv",
                userGroup: "user",
                status: true,
                creatTime: new Date()
            } as Partial<Uart.UserInfo>

            if ((tel && /^(0|86|17951)?(13[0-9]|15[012356789]|166|17[3678]|18[0-9]|14[57])[0-9]{8}$/.test(tel)) || /^(0|86|17951)?(13[0-9]|15[012356789]|166|17[3678]|18[0-9]|14[57])[0-9]{8}$/.test(user)) {
                userinfo.tel = String(tel || user) as any
            }

            if ((mail && /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(mail)) || /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(user)) {
                userinfo.mail = mail || user
            }

            const saltinfo = {
                user,
                salt
            }
            const setupinfo = {
                user,
                tels: userinfo.tel ? [userinfo.tel] : [],
                mail: userinfo.mail ? [userinfo.mail] : [],
                ProtocolSetup: []
            }

            const bind = {
                user,
                UTs: [...devs]
            }

            return {
                user,
                userinfo,
                saltinfo,
                setupinfo,
                bind
            }

        })

        const d = [...deviceMap.entries()]
            .map(([deviceId, devName]) => ({ deviceId, devName }))
            //.filter(el => deviceSet.has(el.deviceId))
            .map(({ deviceId, devName }) => {
                const rg = {
                    DevMac: deviceId,
                    mountNode: 'pesiv'
                }

                const ter = {
                    ...rg,
                    name: devName,
                    mountDevs: [
                        {
                            pid: 0,
                            mountDev: 'UPS',
                            protocol: 'Pesiv卡',
                            Type: "UPS"

                        }
                    ]
                } as Partial<Uart.Terminal>

                return {
                    deviceId,
                    rg,
                    ter
                }

            })

        const users = []
        const useralarm = []
        const userbind = []
        const salt = []

        j.forEach(el => {
            users.push(el.userinfo)
            useralarm.push(el.setupinfo)
            userbind.push(el.bind)
            salt.push(el.saltinfo)
        })

        const rgter = []
        const ter = []

        d.forEach(el => {
            rgter.push(el.rg)
            ter.push(el.ter)
        })

        console.log({
            users: users.length,
            useralarm: useralarm.length,
            userbind: userbind.length,
            rgter: rgter.length,
            deviceMap: deviceMap.size,
            d: new Set([...userMap.values()].map(el => [...el.devices.values()]).flat()).size
        });

        const data = {
            users,
            useralarm,
            userbind,
            salt,
            rgter,
            ter
        }

        for (const key in data) {
            fs.writeFile(join(process.cwd(), `./${key}.json`), JSON.stringify(data[key]))
        }

    }





}

mv()

