import config from '../../config';
import ClaimInvestmentTemplate from '../../Templates/ClaimInvestmentTemplate';
import { sendEmail } from '../../utils/sendEmail';
import { IClaimMail } from './system.interfaces';

const MailToCompany = async (data: IClaimMail) => {
	const template = ClaimInvestmentTemplate(data);

	await sendEmail(config.sender_email, 'Claim Investment', template);
	return {
		message: 'Mail sent successfully!'
	};
};

const SystemServices = {
	MailToCompany
};

export default SystemServices;
