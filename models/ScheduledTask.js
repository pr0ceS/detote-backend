const mongoose = require("mongoose");

const ScheduledTaskSchema = new mongoose.Schema({
  taskKey: String,
  timestamp: Number,
});

const ScheduledTask = mongoose.model("ScheduledTask", ScheduledTaskSchema);

exports.ScheduledTask = ScheduledTask;
