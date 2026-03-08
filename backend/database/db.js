import mongoose from "mongoose";

const connectDB = async()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}WaveMusical`)
        console.log('MongoDb Connected Successfully');
    } catch (error) {
        console.log("MongoDb Connection Failed:", error)
        
    }
}
export default connectDB;