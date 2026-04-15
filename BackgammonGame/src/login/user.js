import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    githubId: { type: String, unique: true, sparse: true },   // 🔹 Aggiunto supporto per GitHub
    uid: { type: String, unique: true, sparse: true }, 
    email: { type: String, required: false, unique: true },
    password: { type: String, required: function () {
        return this.authMethod === "local";
    },
default: null},
    friends: [{  type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendsRequest: [ 
        {
            from:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            status:{ type: String, enum:['attesa', 'accettata', 'rifiutata'], default:'attesa'}
        }
    ],
    gameInvites: [
        {
            from: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            status: { type: String, enum: ['attesa', 'accettata', 'rifiutata'], default: 'attesa' }
        }
    ],
    score: {type: Number, default: 0},
    isGuest: {type: Boolean, default: false},
});

const User = mongoose.model('User', userSchema);

export default User;
