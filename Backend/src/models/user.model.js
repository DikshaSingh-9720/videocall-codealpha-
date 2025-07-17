import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required:true
        },
        username:{
            type: String,
            required:true,
            unique: true
        },
        password: {
            type: String,
            required: true 
        },
        token: { 
            type: String 
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        }
    }
)

const User = mongoose.model("User", userSchema);

export { User };