const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const { ScheduledTask } = require('../models/ScheduledTask'); // Adjust the path as needed

const mailerSend = new MailerSend({
  apiKey: process.env.MAIL_KEY,
});

const SenderMail = process.env.SENDER_MAIL;
const SenderFrom = process.env.SENDER_FROM;
const PaymentReceiveMail = process.env.PAYMENT_RECEIVE_MAIL;
const OrderProcessedMail = process.env.ORDER_PROCESSED_MAIL;
const OrderPackagedMail = process.env.ORDER_PACKAGED_MAIL;
const OrderShippedMail = process.env.ORDER_SHIPPED_MAIL;
const OrderReminderMail = process.env.ORDER_REMINDER_MAIL;

const saveTaskToDatabase = async (taskKey, timestamp) => {
  try {
    const existingTask = await ScheduledTask.findOne({ taskKey });

    if (existingTask) {
      // If the task already exists, update the timestamp
      await ScheduledTask.updateOne({ taskKey }, { timestamp });
    } else {
      // If the task doesn't exist, create a new one
      const task = new ScheduledTask({ taskKey, timestamp });
      await task.save();
    }
  } catch (error) {
    console.error(error);
  }
};

const scheduleEmail = (email, subject, templateId, personalization, delay) => {
  const sentFrom = new Sender(SenderMail, SenderFrom);
  const recipients = [new Recipient(email, email)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject(subject)
    .setTemplateId(templateId)
    .setPersonalization(personalization);

  const taskKey = `${email}-${subject}`;

  // Save the timestamp for recovery in case of a crash
  // saveTaskToDatabase(taskKey, Date.now() + delay);
  saveTaskToDatabase(taskKey, Date.now() + delay * 60 * 1000);

  // Schedule the task using cron
  // cron.schedule(`*/${delay / 60000} * * * *`, async () => {
  //   try {
  //     await mailerSend.email.send(emailParams);
  //     // Remove the task from the database after it's sent
  //     await ScheduledTask.deleteOne({ taskKey });
  //   } catch (error) {
  //     console.error(error);
  //   }
  // });


	// setTimeout(async () => {
	// 	try {
	// 		await mailerSend.email.send(emailParams);
	// 		// Remove the task from the database after it's sent
	// 		await ScheduledTask.deleteOne({ taskKey });
	// 	} catch (error) {
	// 		console.error(error);
	// 	}
	// }, (delay * 86400000));

	if(delay === 0) {
		mailerSend.email.send(emailParams);
		ScheduledTask.deleteOne({ taskKey });
		return true;
	} else if (delay > 0) {
		setTimeout(() => {
			try {
				mailerSend.email.send(emailParams);
				// Remove the task from the database after it's sent
				ScheduledTask.deleteOne({ taskKey });
				return true
			} catch (error) {
				console.error(error);
			}
		}, (delay * 86400000));
	} else {
		console.log("error")
	}
};

const sendPaymentReceive = (email, name, ordernumber) => {
  const subject = "Your Payment has been Received";
  const templateId = PaymentReceiveMail;
  const personalization = [
    {
      email: email,
      data: {
				name: name,
				order_number: ordernumber
			},
    },
  ];
  const delay = 0; // Send immediately after payment

  scheduleEmail(email, subject, templateId, personalization, delay);
};

const sendOrderProcessed = (email, name) => {
  const subject = "Your Order is Being Processed";
  const templateId = OrderProcessedMail;
  const personalization = [
    {
      email: email,
      data: {
				name: name
			},
    },
  ];
  // const delay = 2 * 24 * 60 * 60 * 1000; // 2 days delay
  const delay = 5; // 2 minutes delay

  scheduleEmail(email, subject, templateId, personalization, delay);
};

const sendOrderPackaged = (email, name) => {
  const subject = "Your Order is Being Packaged";
  const templateId = OrderPackagedMail;
  const personalization = [
    {
      email: email,
      data: {
				name: name
			},
    },
  ];
  // const delay = 4 * 24 * 60 * 60 * 1000; // 4 days delay
  const delay = 10; // 4 minutes delay

  scheduleEmail(email, subject, templateId, personalization, delay);
};

const sendOrderShipped = (email, name) => {
  const subject = "Your Order Has Been Shipped";
  const templateId = OrderShippedMail;
  const personalization = [
    {
      email: email,
      data: {
				name: name
			},
    },
  ];
  // const delay = 7 * 24 * 60 * 60 * 1000; // 7 days delay
  const delay = 15; // 7 minutes delay

  scheduleEmail(email, subject, templateId, personalization, delay);
};

const sendOrderReminder = (email, name) => {
  const subject = "Reminder: Your Order Will be Delivered Soon";
  const templateId = OrderReminderMail;
  const personalization = [
    {
      email: email,
      data: {
				name: name
			},
    },
  ];	
  // const delay = 9 * 24 * 60 * 60 * 1000; // 9 days delay
  const delay = 20; // 9 minutes delay

  scheduleEmail(email, subject, templateId, personalization, delay);
};

const sendOutMails = (email, name, ordernumber) => {
  sendPaymentReceive(email, name, ordernumber);
  sendOrderProcessed(email, name);
  sendOrderPackaged(email, name);
  sendOrderShipped(email, name);
  sendOrderReminder(email, name);
}

module.exports = {
  sendOutMails
};
