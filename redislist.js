const { createClient } = require('redis')

const client = createClient({
    url: 'redis://localhost:63791'
})

client.connect()
.then(async () => {

    // deleting the existing task key
    await client.del('tasks')

    // following is an example of LIFO queue where items are added at left end and removed from right end

    // adding items in tasks list from left side
    for (let n = 1; n <= 10; n++) {
        const item = `Task ${n}`
        await client.lPush('tasks', item)
        console.log(`${item} added to tasks list`)
    }

    // removing the oldest item from tasks list
    const oldest1 = await client.rPop("tasks")

    // removing the newest item from tasks list
    const newest1 = await client.lPop('tasks')

    console.log(`oldest '${oldest1}' newest '${newest1}'`)

    // quit() vs disconnect()
    // quit: ensures that all the command are executed before closing connection. it waits untill the command is flushed 
    //       to server 
    // disconnect: on the other hand disconnect close the connection immediately without waiting for the command to flush to flush
    //              the server
    //
    // if i user disconnect in stead of quit there is a change the last command i.e. the rPop is not flushed to the server. therefore,
    // rPop may not happened in server side.

    // await client.disconnect()
    await client.quit()
   
})
.catch(err => console.log('error: ', err))