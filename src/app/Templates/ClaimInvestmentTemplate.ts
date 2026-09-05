import { IClaimMail } from '../modules/system/system.interfaces';

const ClaimInvestmentTemplate = (claim: IClaimMail) => {
	const { name, mobile, actual_amount, due_amount, reference, investment_type } = claim;

	return `
  <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Investment Claim</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #242D39; color: #ffffff; padding: 10px 20px; text-align: center; font-size: 24px;">
            Investment Claim Request
        </div>
        <div style="padding: 20px; text-align: left;">
            <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Dear Goal Team,</p>
            <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
                This is to inform you that <strong>${name}</strong> has requested to claim their investment with the details below:
            </p>
            <table style="width: 100%; font-size: 16px; color: #333333; margin-bottom: 20px;">
              <tr>
                    <td style="padding: 8px; font-weight: bold;">Name:</td>
                    <td style="padding: 8px;">${name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Mobile:</td>
                    <td style="padding: 8px;">${mobile}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Reference:</td>
                    <td style="padding: 8px;">${reference}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Investment Type:</td>
                    <td style="padding: 8px;">${investment_type.toUpperCase()}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Actual Amount:</td>
                    <td style="padding: 8px;">$${actual_amount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Due Amount:</td>
                    <td style="padding: 8px;">$${due_amount.toFixed(2)}</td>
                </tr>
            </table>
            <p style="font-size: 16px; color: #333333; margin-top: 20px;">Please review and process this claim at your earliest convenience. For any clarifications, feel free to reach out to ${name} at the provided mobile number.</p>
        </div>
        <div style="margin-top: 20px; padding: 10px; font-size: 12px; color: #777777; text-align: center;">
            <p>This email was sent as a formal investment claim request. If you received it by mistake, please disregard it.</p>
            <p>&copy; 2024 Goal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

export default ClaimInvestmentTemplate;
