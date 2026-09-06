from pydantic import BaseModel
from typing import List


class Person(BaseModel):
    name: str


class PhoneNumber(BaseModel):
    number: str


class BankAccount(BaseModel):
    account_number: str


class Location(BaseModel):
    name: str


class Organization(BaseModel):
    name: str


class Relationship(BaseModel):
    source: str
    target: str
    type: str


class ExtractedEntities(BaseModel):
    persons: List[Person] = []
    phone_numbers: List[PhoneNumber] = []
    bank_accounts: List[BankAccount] = []
    locations: List[Location] = []
    organizations: List[Organization] = []
    relationships: List[Relationship] = []