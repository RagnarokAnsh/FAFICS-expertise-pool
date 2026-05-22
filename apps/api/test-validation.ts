import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateApplicationDto } from './src/modules/applications/dto/create-application.dto';
import 'reflect-metadata';

const payload = {
  personal: {
    firstName: "Ansh",
    middleName: "",
    lastName: "Sharma",
    dateOfBirth: "2002-08-24",
    email: "sharmaansh010@gmail.com",
    gender: "Male",
    nationality: "Indian",
    phone: "+918510878000",
    secondNationality: "",
    separationDate: "2025-07-25",
    whatsapp: ""
  },
  association: {
    associationName: "TEST",
    associationCountry: "India",
    associateMemberCountry: "India",
    associateMemberName: "",
    associationGeneralEmail: "sharmaansh010@gmail.com",
    associationId: "00000000-0000-0000-0000-000000000001",
    presidentEmail: "sharmaansh010@gmail.com",
    presidentPhone: "+918510878000"
  }
};

async function test() {
  const dto = plainToInstance(CreateApplicationDto, payload);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    console.log(JSON.stringify(errors, null, 2));
  } else {
    console.log("Validation passed!");
  }
}

test();
