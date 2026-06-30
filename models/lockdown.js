import mongoose from "mongoose";


const Schema = mongoose.Schema;



const lockdownSchema = new Schema({
    isLockdownMode: {
        type: Boolean,
        default: false,
    },
    maintenanceMessage: {
        type: String,
        default: '',
    }
});

lockdownSchema.statics.getLockdownDoc = async function () {
    const doc = await this.findOne({});

    return doc;
}



lockdownSchema.statics.isLockedDown = async function () {
    const doc = await this.getLockdownDoc();

    if (!doc) {
        return { lockdown: false, msg: '' };
    }

    return { lockdown: doc.isLockdownMode, doc: doc, msg: doc.maintenanceMessage || '' };
}

lockdownSchema.statics.setLockdownState = async function (req, lockdown, msg) {

    if (req.isAuthenticated() === false) {
        return;
    }
    if (!req.user || req.user.admin !== true) {
        return;
    }

    let doc = await this.findOne({});

    if (!doc) {
        doc = new this({});
    }

    doc.maintenanceMessage = msg;

    doc.isLockdownMode = lockdown;

    await doc.save();
}



const Lockdown = mongoose.model('LockDown', lockdownSchema);






export default Lockdown;