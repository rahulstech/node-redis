/**
 * this is an example of producer consumer using redis list with its blocking pop feature using two clients
 */
const { createClient } = require('redis')

const url = "redis://localhost:63791"

const kTasks = 'tasks'

// independent client responsible to producing only
const producerClient = createClient({ url })

// independent client responsible for consuming only
const consumerClient = createClient({ url })

// here consumer blocks indefinitely, but it will not block producer client to execute commands independently
async function consume() {
    while(true) {
        console.log('waiting for next item...')
        const item = await consumerClient.brPop(kTasks, 0)
        if (null === item) {
            console.log('no more item')
            break
        }
        console.log('next item ', item)
    }
}

// producing certain no of items at regular interval
function produce(count) {
    
    return new Promise( (resolve) => {

        const instance = setInterval(() => {
            if (count === 0) {
                console.log('no more item to push')
                clearInterval(instance)
                resolve()
                return
            }

            const element = `Task ${count}`
            producerClient.lPush(kTasks, element)
            --count

        }, 500)
    })
}

// connecting to consumer client first. it will wait indefinitely for next items
// i started it first to prove that blocking command of consumer does not cause problem for producer
consumerClient.connect()
.then(async () => {
    await consume(1.2)

    await consumerClient.quit()
})
.catch( err => console.log('error in consumer client ', err))

// then connecting to producer client
producerClient.connect()
.then( async () => {
    await produce(10)

    await producerClient.quit()
})
.catch( err => console.log('error in producer client ', err))