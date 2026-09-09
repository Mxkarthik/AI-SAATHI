const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: ["expense", "earning", "saving"],
        message: "type must be one of: expense, earning, saving",
      },
      required: [true, "Transaction type is required"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    category: {
      type: String,
      trim: true,
      default: "Other",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    sourceText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Common query pattern: a user's transactions ordered by date
transactionSchema.index({ userId: 1, date: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;